// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title FreClean Service Agreement Registry
/// @notice Records the existence and payment-compliance status of FreClean's
///         multi-year B2B agreements (hotel, Airbnb/property management,
///         office cleaning, and product supply contracts) on Celo.
/// @dev    This contract deliberately does NOT hold funds, issue a token, or
///         take any automated action. It is a tamper-evident attestation
///         registry only; see docs/JUSTIFICATION.md for why this is the
///         entire scope. Actual payments are made and verified through
///         freclean-payment exactly as for any other FreClean payment; this
///         contract just records the resulting compliance history so a
///         counterparty can independently check it without trusting
///         FreClean's own database.
contract ServiceAgreementRegistry {
    enum AgreementType {
        HotelCleaning,
        AirbnbPropertyManagement,
        OfficeCleaning,
        ProductSupply
    }

    enum PaymentInterval {
        Monthly,
        Quarterly,
        Annually
    }

    enum AgreementStatus {
        Active,
        PaymentOverdue,
        Completed,
        Terminated
    }

    struct Agreement {
        // keccak256 hash of the signed legal document (see legal-templates/).
        // The document itself is never stored on-chain — only proof it exists
        // and hasn't been altered.
        bytes32 documentHash;
        AgreementType agreementType;
        // A pseudonymous or business identifier for the counterparty, chosen
        // by FreClean at agreement creation — not necessarily a wallet
        // address, since not every counterparty pays via Celo.
        string counterpartyRef;
        uint64 startDate;      // unix timestamp
        uint64 termMonths;     // e.g. 24, 36, 48
        PaymentInterval paymentInterval;
        AgreementStatus status;
        uint64 lastPaymentConfirmedAt; // unix timestamp, 0 if none yet
        uint32 paymentsConfirmed;
        uint32 paymentsMissed;
    }

    address public owner;
    // Addresses (FreClean's own backend service accounts) permitted to record
    // agreements and payment events — separate from `owner`, so day-to-day
    // recording doesn't require the owner key. See docs/DEPLOYMENT.md.
    mapping(address => bool) public authorizedRecorders;

    uint256 public nextAgreementId;
    mapping(uint256 => Agreement) public agreements;

    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event RecorderAuthorized(address indexed recorder, bool authorized);
    event AgreementCreated(uint256 indexed agreementId, AgreementType agreementType, bytes32 documentHash);
    event PaymentConfirmed(uint256 indexed agreementId, uint64 timestamp, uint32 paymentsConfirmed);
    event PaymentMissed(uint256 indexed agreementId, uint64 timestamp, uint32 paymentsMissed);
    event AgreementStatusChanged(uint256 indexed agreementId, AgreementStatus previousStatus, AgreementStatus newStatus);

    modifier onlyOwner() {
        require(msg.sender == owner, "ServiceAgreementRegistry: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedRecorders[msg.sender],
            "ServiceAgreementRegistry: caller is not authorized to record"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ServiceAgreementRegistry: new owner is the zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setAuthorizedRecorder(address recorder, bool authorized) external onlyOwner {
        authorizedRecorders[recorder] = authorized;
        emit RecorderAuthorized(recorder, authorized);
    }

    /// @notice Registers a new multi-year agreement. Called by FreClean's
    ///         backend once a legal contract (see legal-templates/) is signed.
    function createAgreement(
        bytes32 documentHash,
        AgreementType agreementType,
        string calldata counterpartyRef,
        uint64 startDate,
        uint64 termMonths,
        PaymentInterval paymentInterval
    ) external onlyAuthorized returns (uint256 agreementId) {
        require(documentHash != bytes32(0), "ServiceAgreementRegistry: documentHash required");
        require(termMonths > 0, "ServiceAgreementRegistry: termMonths must be > 0");

        agreementId = nextAgreementId++;
        agreements[agreementId] = Agreement({
            documentHash: documentHash,
            agreementType: agreementType,
            counterpartyRef: counterpartyRef,
            startDate: startDate,
            termMonths: termMonths,
            paymentInterval: paymentInterval,
            status: AgreementStatus.Active,
            lastPaymentConfirmedAt: 0,
            paymentsConfirmed: 0,
            paymentsMissed: 0
        });

        emit AgreementCreated(agreementId, agreementType, documentHash);
    }

    /// @notice Records a confirmed payment for an agreement, per
    ///         freclean-payment's own "confirmed" status — this contract does
    ///         not itself verify the payment, it records that freclean-payment
    ///         already did.
    function recordPaymentConfirmed(uint256 agreementId, uint64 timestamp) external onlyAuthorized {
        Agreement storage agreement = agreements[agreementId];
        require(agreement.documentHash != bytes32(0), "ServiceAgreementRegistry: agreement does not exist");
        require(
            agreement.status == AgreementStatus.Active || agreement.status == AgreementStatus.PaymentOverdue,
            "ServiceAgreementRegistry: agreement is not active"
        );

        agreement.paymentsConfirmed += 1;
        agreement.lastPaymentConfirmedAt = timestamp;

        if (agreement.status == AgreementStatus.PaymentOverdue) {
            _setStatus(agreementId, AgreementStatus.Active);
        }

        emit PaymentConfirmed(agreementId, timestamp, agreement.paymentsConfirmed);
    }

    /// @notice Records a missed payment. This has no automated consequence —
    ///         see docs/JUSTIFICATION.md. It only marks the agreement
    ///         PaymentOverdue so the status is independently checkable.
    function recordPaymentMissed(uint256 agreementId, uint64 timestamp) external onlyAuthorized {
        Agreement storage agreement = agreements[agreementId];
        require(agreement.documentHash != bytes32(0), "ServiceAgreementRegistry: agreement does not exist");
        require(agreement.status == AgreementStatus.Active, "ServiceAgreementRegistry: agreement is not active");

        agreement.paymentsMissed += 1;
        _setStatus(agreementId, AgreementStatus.PaymentOverdue);

        emit PaymentMissed(agreementId, timestamp, agreement.paymentsMissed);
    }

    function markCompleted(uint256 agreementId) external onlyAuthorized {
        _requireExists(agreementId);
        _setStatus(agreementId, AgreementStatus.Completed);
    }

    function markTerminated(uint256 agreementId) external onlyAuthorized {
        _requireExists(agreementId);
        _setStatus(agreementId, AgreementStatus.Terminated);
    }

    function getAgreement(uint256 agreementId) external view returns (Agreement memory) {
        _requireExists(agreementId);
        return agreements[agreementId];
    }

    function _requireExists(uint256 agreementId) internal view {
        require(agreements[agreementId].documentHash != bytes32(0), "ServiceAgreementRegistry: agreement does not exist");
    }

    function _setStatus(uint256 agreementId, AgreementStatus newStatus) internal {
        AgreementStatus previous = agreements[agreementId].status;
        agreements[agreementId].status = newStatus;
        emit AgreementStatusChanged(agreementId, previous, newStatus);
    }
}

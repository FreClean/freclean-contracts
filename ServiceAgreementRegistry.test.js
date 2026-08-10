const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ServiceAgreementRegistry", function () {
  let registry, owner, recorder, stranger;

  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("hotel-agreement-v1"));

  beforeEach(async function () {
    [owner, recorder, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ServiceAgreementRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
    await registry.setAuthorizedRecorder(recorder.address, true);
  });

  it("sets the deployer as owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("only the owner can authorize a recorder", async function () {
    await expect(
      registry.connect(stranger).setAuthorizedRecorder(stranger.address, true)
    ).to.be.revertedWith("ServiceAgreementRegistry: caller is not the owner");
  });

  it("lets an authorized recorder create an agreement", async function () {
    const tx = await registry
      .connect(recorder)
      .createAgreement(documentHash, 0 /* HotelCleaning */, "hotel-leogane-01", 1735689600, 36, 1 /* Quarterly */);
    await expect(tx).to.emit(registry, "AgreementCreated").withArgs(0, 0, documentHash);

    const agreement = await registry.getAgreement(0);
    expect(agreement.termMonths).to.equal(36);
    expect(agreement.status).to.equal(0); // Active
  });

  it("rejects agreement creation from an unauthorized caller", async function () {
    await expect(
      registry.connect(stranger).createAgreement(documentHash, 0, "x", 0, 12, 0)
    ).to.be.revertedWith("ServiceAgreementRegistry: caller is not authorized to record");
  });

  it("rejects an agreement without a document hash", async function () {
    await expect(
      registry.connect(recorder).createAgreement(ethers.ZeroHash, 0, "x", 0, 12, 0)
    ).to.be.revertedWith("ServiceAgreementRegistry: documentHash required");
  });

  it("tracks confirmed and missed payments, and recovers from overdue", async function () {
    await registry.connect(recorder).createAgreement(documentHash, 2 /* OfficeCleaning */, "office-01", 0, 24, 0);

    await registry.connect(recorder).recordPaymentMissed(0, 1000);
    let agreement = await registry.getAgreement(0);
    expect(agreement.status).to.equal(1); // PaymentOverdue
    expect(agreement.paymentsMissed).to.equal(1);

    await registry.connect(recorder).recordPaymentConfirmed(0, 2000);
    agreement = await registry.getAgreement(0);
    expect(agreement.status).to.equal(0); // back to Active
    expect(agreement.paymentsConfirmed).to.equal(1);
    expect(agreement.lastPaymentConfirmedAt).to.equal(2000);
  });

  it("marks an agreement completed and terminated", async function () {
    await registry.connect(recorder).createAgreement(documentHash, 3 /* ProductSupply */, "supply-01", 0, 12, 2);

    await registry.connect(recorder).markCompleted(0);
    expect((await registry.getAgreement(0)).status).to.equal(2); // Completed

    await registry.connect(recorder).markTerminated(0);
    expect((await registry.getAgreement(0)).status).to.equal(3); // Terminated
  });

  it("reverts when querying a nonexistent agreement", async function () {
    await expect(registry.getAgreement(999)).to.be.revertedWith(
      "ServiceAgreementRegistry: agreement does not exist"
    );
  });

  it("never exposes any fund-custody function — this is a registry only", async function () {
    const fragments = registry.interface.fragments.map((f) => f.name).filter(Boolean);
    const forbidden = ["deposit", "withdraw", "transfer", "receive", "fallback"];
    for (const name of forbidden) {
      expect(fragments).to.not.include(name);
    }
  });
});

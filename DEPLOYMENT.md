# Deployment

## Sequence

1. Deploy to Celo Alfajores (testnet) first: `npx hardhat run scripts/deploy.js --network celoAlfajores`.
2. Verify the deployed contract's source on the Alfajores block explorer.
3. Authorize FreClean's backend service account (the same account `freclean-payment`'s worker uses; see that repo's `FRECLEAN_API_WORKER_TOKEN`) via `setAuthorizedRecorder`.
4. Run a full staging cycle: create a test agreement, record a confirmed and a missed payment, confirm the status transitions match `test/ServiceAgreementRegistry.test.js`.
5. Only after a staging cycle is reviewed does mainnet deployment (`celoMainnet`) happen. This is a deliberate gate, not a formality.

## Key management

The deployer key and the authorized recorder key are **not** the FreClean treasury key (see `freclean-payment/SECURITY.md`). This contract never touches funds, so it does not need treasury-level custody. It still needs its own careful key management: whoever holds the recorder key can write (but never falsify existing history, since events are immutable) agreement and payment records.

## What is NOT yet done

- Not deployed anywhere yet. This repo ships the contract, tests, and deployment tooling, not a live address.
- No third-party audit yet. Given the contract holds no funds and has a narrow, well-tested surface, a full paid audit is a reasonable thing to defer until real agreement volume justifies the cost, but this should be revisited before mainnet deployment, not skipped permanently.

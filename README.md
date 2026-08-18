# FreClean Contracts

Two things live here, both serving FreClean's move into multi-year B2B relationships:

1. **Markdown contract templates** in the repo root provide four real contract templates (hotel cleaning, Airbnb/property management cleaning, office cleaning, and product supply agreements), each supporting 2–4 year terms. Polished `.docx` versions are generated alongside the source files.
2. **`ServiceAgreementRegistry.sol`** is FreClean's one smart contract: a Celo registry that records the existence and payment-compliance status of these agreements. No token, no fund custody, no automated enforcement.

## Why this repo exists now

FreClean's build standard is explicit that smart contracts are only added when a genuine technical requirement exists. **Read `JUSTIFICATION.md` first**. It lays out exactly what that requirement is: a tamper-evident, independently checkable payment-compliance record for multi-year B2B clients. It also explains what was deliberately left out: a token, escrow, and automated penalties.

## Legal templates

| Template | Use case | Word doc |
|---|---|---|
| Hotel Cleaning Services Agreement | 2–4 year hotel room-turnover and common-area cleaning contracts | `hotel-cleaning-services-agreement.docx` |
| Airbnb / Property Management Cleaning Agreement | Standing turnover-cleaning relationships with property owners/managers | `airbnb-property-management-agreement.docx` |
| Office Cleaning Services Agreement | 2–4 year recurring office cleaning contracts | `office-cleaning-services-agreement.docx` |
| Product Supply Agreement | Recurring wholesale product delivery to a business (retailer, distributor, or an Entrepreneur Program participant's registered business) | `product-supply-agreement.docx` |

Every template is marked **"requires legal review before use"** and leaves governing law, insurance specifics, and exact rates blank instead of inventing placeholder figures, consistent with FreClean's realism principle. Regenerate the Word versions after editing a template's markdown source:

```bash
npm install
npm run gen:contracts-docx    # *.md → *.docx beside their markdown sources
```

## Smart contract

```bash
npm install
npm test              # Hardhat test suite
npm run compile
npm run deploy:alfajores   # testnet first; see DEPLOYMENT.md
```

`contracts/ServiceAgreementRegistry.sol` stores, per agreement: a hash of the signed document (never the document itself), the agreement type, term length, payment interval, and a status FreClean's backend updates as `freclean-payment` confirms or misses a payment. Fully tested; see `test/ServiceAgreementRegistry.test.js`, including an explicit test asserting the contract exposes no fund-custody function at all.

## Status

- Legal templates: drafted, **not yet reviewed by counsel**. Do not send to a real client as final.
- Smart contract: written and tested, **not yet deployed anywhere**. See `DEPLOYMENT.md` for the required staging sequence before any mainnet use.

## How this connects to the rest of the ecosystem

- Payment confirmation that would be recorded on-chain comes from `freclean-payment`'s existing verification worker. This repo does not duplicate or reimplement that logic.
- Wholesale pricing referenced in the Product Supply Agreement template pulls from `freclean-entrepreneurship/docs/05-pricing-guidance.md` once finalized, not invented here.

## License

Not provided.

# Why This Repo Exists Now

FreClean's build standard is explicit: **do not create unnecessary smart contracts; `freclean-contracts` should only be implemented if a genuine technical requirement exists.** This document is that justification, written before any code, so the reasoning is checkable rather than assumed.

## The genuine requirement

FreClean is moving from single-visit bookings toward **multi-year B2B agreements**: hotel cleaning contracts, Airbnb/property-management cleaning contracts, office cleaning contracts (2–4 year terms), and recurring product-supply agreements for businesses that buy FreClean products on a standing basis. These are real commercial contracts (see `legal-templates/`), and most of the value here is legal document work, not blockchain work.

The specific piece that *does* warrant a smart contract: for a B2B client paying via Celo (FreClean's existing Web3 rail; see `freclean-payment`), a multi-year agreement benefits from a **tamper-evident, independently checkable record of the agreement's existence and payment compliance**. That record is something neither party can quietly alter after the fact, and something a hotel's or office's own finance team can verify on-chain without trusting FreClean's own database.

## What was deliberately NOT built

- **No token.** Nothing here is a currency, a share, or a speculative asset.
- **No escrow or custody.** The contract never holds funds. Money still moves exactly as it does today: cash, card, or a direct USDm payment verified by `freclean-payment`. This contract only *records* that an agreement and its payment schedule exist and whether payments are on track.
- **No automated enforcement.** The contract does not cancel a booking, withhold service, or take any action. It is a registry, not a controller. Real-world consequences of a missed payment are handled by FreClean's operations and legal process, not by code.

## Scope

One contract: `ServiceAgreementRegistry.sol`. It stores, per agreement: a hash of the signed legal document (not the document itself; contract terms are private), the client's identifier, the term length, the expected payment interval, and a status that FreClean's backend updates as payments are confirmed (via `freclean-payment`) or missed. Anyone can verify an agreement's payment-compliance history on-chain; no one but FreClean's authorized backend can write to it.

If this repo starts growing beyond that one, narrow purpose, such as token logic, escrow, or automated penalties, that would be a strategy change requiring its own justification, not an extension of this one.

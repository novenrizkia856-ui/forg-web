# 1. Problem & Background

## The Synchronization Problem

Stock Tokens represent real-world stocks onchain. The problem is that **the underlying stock can change while the token continues operating as usual.**

Example of a problematic flow:

```
Real-world stock    -> dividend announced
Onchain Stock Token -> remains unchanged
DeFi application    -> may not know the dividend occurred
```

Without a synchronization layer, this can cause:

- Inconsistent data across wallets, protocols, issuers, and applications
- Users interacting with Stock Tokens based on outdated information
- No clear audit trail showing when and how a corporate action was applied

## FORG's Purpose

FORG provides a **standard infrastructure layer** for handling corporate actions on Stock Tokens, so that:

- Every change to the underlying stock is reflected consistently across all connected onchain systems and applications
- Every event has evidence and a verifiable status
- Execution remains in the hands of authorized parties (issuers/protocols) — FORG only detects, interprets, and generates instructions

## Examples of Corporate Actions Handled

- Dividends
- Stock splits
- Reverse splits
- Trading halts
- Ticker/symbol changes
- Mergers
- Acquisitions
- Delistings
- Asset redemptions
- Corporate reorganizations

> **Scope note:** The initial version of FORG (MVP) focuses on **dividends, stock splits, and trading status changes (trading halts)** rather than trying to support every type of corporate action at once. See [Core Concepts & MVP Scope](02-core-concepts-and-mvp-scope.md).

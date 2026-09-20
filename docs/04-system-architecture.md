# 4. System Architecture

## Overview

FORG consists of four core components that operate sequentially, with an API layer at the end.

```
External Data / Issuer
        |
Corporate Action Detection
        |
   Normalizer
        |
 Verification Engine
        |
 Corporate Action Database
        |
    State Machine
        |
 Onchain Action Engine
        |
RH Chain / Stock Token Contracts
        |
        API
        |
Wallet / DeFi / Other Applications
```

## A. Corporate Action Detection

This component continuously ingests corporate-action information from authoritative sources or directly from issuers. For each event, the system detects the following attributes:

- Event type
- Underlying asset
- Announcement date
- Record date
- Ex-date
- Effective date
- Ratio/amount
- Status
- Source/evidence

## B. Normalizer

Each external source has its own data format. The Normalizer converts all of these formats into **one standardized schema** used throughout the system. Conceptually, for example:

```
asset: STOCK_TOKEN_X
event_type: DIVIDEND
amount: 0.42 USD
record_date: 2026-10-05
payment_date: 2026-10-20
status: ANNOUNCED
```

Every supported corporate action type must have a consistent machine-readable representation like this.

## C. Onchain Action Engine

This component determines **what needs to happen onchain** when an event becomes effective.

**Example — Stock Split:**

```
1 token -> 2 tokens
(or another conversion ratio defined by the event)
```

**Example — Dividend:**

```
Dividend announced
   |
Eligibility determined
   |
Distribution instruction generated
   |
Issuer executes distribution
   |
Event marked complete
```

The key principle is that the **Onchain Action Engine does not custody user funds.** It only generates the required instructions/events, while execution remains with the authorized issuer or protocol. The security principles are discussed in detail in [Section 6](06-onchain-layer-and-security.md).

## D. API / Developer Layer

This layer exposes corporate-action information to other applications (wallets, DeFi protocols, third-party dashboards). Endpoint concepts are discussed in detail in [Section 7](07-api-sdk-and-webhooks.md).

## Dashboard (Frontend) — Concept

FORG provides a simple dashboard with two types of pages:

**Asset Page** — displays the asset status and a list of related corporate actions, for example:

```
STOCK TOKEN X
Status: ACTIVE

Corporate Actions
- Dividend - $0.42         | Payment: Oct 20  | VERIFIED
- Stock Split - 2:1        | Effective: Nov 4 | SCHEDULED
```

**Event Page** — displays the details of a single event: event type, asset, timeline, current status, amount/ratio, evidence, verification status, onchain transaction, and execution status.

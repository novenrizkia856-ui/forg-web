# 2. Core Concepts & MVP Scope

## What is a "Corporate Action"?

A **Corporate Action** is any official event announced by a company/issuer that changes the condition or value of the stock underlying a Stock Token. Examples include dividends, stock splits, and trading halts.

Every corporate action, regardless of type, has a standardized data representation (see [Normalizer](04-system-architecture.md)) so downstream systems (onchain engine, API, dashboard) do not need to understand the original format of each data source.

## Design Principle: Start Narrow, Not Universal

FORG is **not** being built as a universal corporate-action engine from day one. The MVP principles are:

- Support the most frequent and impactful event types first
- Support one blockchain first
- Support one token standard first
- Expand the scope after the foundation has proven stable

## MVP Scope

| Aspect | Initial Scope |
|---|---|
| Corporate action types | Dividends, Stock Splits, Trading Halts / Status Changes |
| Blockchain | One chain (RH Chain, as long as the target Stock Token ecosystem supports the required token infrastructure) |
| Token standard | One specific token standard aligned with the target Stock Token ecosystem |
| Data sources | Corporate-action feeds from issuers or other authoritative sources |

Other corporate action types (reverse splits, ticker changes, mergers, acquisitions, delistings, redemptions, reorganizations) are documented as **long-term development directions**, not as part of the MVP.

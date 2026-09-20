# 5. Verification Layer & Asset Status

## Why Verification Matters

Every corporate action capable of triggering an onchain action must have **traceable evidence**. Without it, there is no reliable way to distinguish valid data from incorrect or even manipulated data.

## What Is Stored as Evidence

For every event, FORG stores:

- Source
- Source reference/URL
- Timestamp
- Original event data
- Normalized event data
- Verification status
- Hash/version
- Reviewer or issuer confirmation (when applicable)

Conceptual example:

```
Event: Dividend
Status: VERIFIED
Source: Issuer corporate-action feed
Detected: 2026-09-19 14:32 UTC
Verified: 2026-09-19 14:40 UTC
```

Together, this data forms an **auditable history** for each event, from the moment it is first detected until execution is complete.

## Asset State

In addition to per-event status, FORG also stores the **current state** of every supported Stock Token. Conceptually, for example:

```
Asset: STOCK_TOKEN_X
Status: ACTIVE
Pending Corporate Actions: 1
Last Corporate Action: DIVIDEND
Last Updated: 2026-09-19T14:32:00Z
```

Connected applications (wallets, DeFi protocols) can check this state **before** allowing interaction with the Stock Token — for example, delaying a transaction when a corporate action is pending or has a `CONFLICTED` status.

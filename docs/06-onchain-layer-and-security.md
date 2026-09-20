# 6. Onchain Layer & Security Principles

## Core Principle: No Custody of User Funds

FORG **never** moves user funds automatically. The workflow must be separated into four explicit stages:

```
Detection -> Verification -> Instruction -> Authorized Execution
```

FORG is responsible for making events and required actions **clear and verifiable**. Final execution is always performed by the authorized issuer or official protocol — not by FORG itself.

This aligns with a non-custodial design principle: there is no function that can unilaterally move user funds without authorization from the entitled party.

## Onchain Action Engine

The engine determines which onchain action is required when an event becomes `EFFECTIVE`:

- **Stock Split** → determines the token conversion ratio (e.g. 1:2) that needs to be applied to the Stock Token representation
- **Dividend** → generates a distribution instruction based on token-holder eligibility, to be executed by the issuer
- **Trading Halt** → updates the asset status so connected applications know to suspend or delay interactions

## Required Security Mechanisms

Every FORG implementation must provide:

- **Idempotency** — reprocessing the same event must not produce duplicate effects
- **Replay protection** — prevents old instructions from being executed again without authorization
- **Role-based permissions** — only authorized parties can verify or execute events
- **Event versioning** — every change to an event is recorded as a new version rather than overwriting old data
- **Audit logs** — all actions (detection, verification, execution, override) are recorded
- **Manual override** — authorized operators can intervene manually when necessary
- **Emergency pause** — the ability to stop all automatic processing during an emergency
- **Conflicting-source detection** — detects when data sources disagree and moves the event to `CONFLICTED` status

# 7. API, SDK & Webhooks (Concept)

> This section describes the **concept** of FORG's API surface — not the final implementation specification.

## API Layer Principles

The API layer exposes two types of capabilities:

1. **Read** — retrieve corporate-action data and asset status for other applications
2. **Authorized write** — submit, verify, or execute events, available only to authorized parties

## API Capability Concepts

| Capability | Purpose |
|---|---|
| Retrieve all corporate actions for an asset | Display the history and active events for a Stock Token |
| Retrieve details for a single event | Display the timeline, evidence, and complete status of an event |
| Retrieve the current status of an asset | Check whether the asset is currently safe to interact with |
| Retrieve the list of supported assets | Display all Stock Tokens covered by FORG |
| Submit a new event | Allow an authorized source to report a new corporate action |
| Verify an event | Move an event from `DETECTED` to `VERIFIED` |
| Execute/confirm an event | Mark that an onchain instruction has been executed by an authorized party |

## SDK (Concept)

FORG provides a lightweight SDK so wallets and DeFi protocols can integrate without building their own corporate-action systems. Conceptually, usage is as simple as:

- Requesting the list of corporate actions for a Stock Token
- Requesting the current status of a Stock Token

## Webhooks / Alerts

Other applications can subscribe to notifications when an event's status changes, including events such as:

- `corporate_action.detected`
- `corporate_action.verified`
- `corporate_action.effective`
- `corporate_action.executed`
- `corporate_action.conflicted`

This means applications do not need to continuously poll the API — they can react in real time when a corporate action changes status.

# 3. Event Lifecycle

Every corporate action entering FORG moves through a predictable sequence of stages. The goal is for every person — and every system — to know exactly which stage an event is in and what is allowed to happen next.

## Normal Stages

```
DETECTED -> VERIFIED -> ANNOUNCED -> SCHEDULED -> EFFECTIVE -> EXECUTED -> CONFIRMED
```

| Status | Meaning |
|---|---|
| `DETECTED` | The raw event is first received from a data source |
| `VERIFIED` | The event has been matched/validated against a trusted source |
| `ANNOUNCED` | The event has been officially announced and is ready to be published through the API/dashboard |
| `SCHEDULED` | The effective date has been determined and the system is waiting for it to arrive |
| `EFFECTIVE` | The event is now in effect according to its effective date |
| `EXECUTED` | The onchain instruction has been executed by an authorized party |
| `CONFIRMED` | Execution has been confirmed and the event is considered complete |

## Special Status: CONFLICTED

If conflicting information is found across different sources for the same event, the event is moved to the following status:

```
CONFLICTED
```

In this state, **the system stops all automatic execution** for that event until the conflict is resolved manually. This is one of FORG's core safety principles — it is better to stop than to execute based on uncertain data.

## Why This Lifecycle Matters

- Provides clear checkpoints before onchain execution occurs
- Simplifies auditing: every status change can be recorded with a timestamp and its source
- Allows manual intervention at every stage when necessary

# FORG
### Corporate Actions Infrastructure for Stock Tokens

> "Stocks change. Your Stock Token should know."

## What is FORG?

FORG is middleware infrastructure that detects, interprets, and applies **corporate actions** (dividends, stock splits, trading halts, etc.) to onchain representations of tokenized stocks (**Stock Tokens**).

FORG sits between three parties:

- **Stock Token issuer** — the source of official information about what happens to the underlying stock
- **Onchain smart contracts** — the tokenized representation of the stock
- **Applications that depend on Stock Tokens** — wallets, DeFi protocols, dashboards, etc.

When something happens to a real-world stock, FORG automatically informs the blockchain and every connected application about what changed.

## The Problem in Brief

A Stock Token that has already been issued onchain **does not automatically know** when its underlying stock pays a dividend, undergoes a split, or has trading halted. Without a synchronization layer, wallets and DeFi protocols may continue operating with outdated or incorrect data.

## Scope of This Documentation

This documentation covers the **concept and technical design** of FORG — not implementation code. Its purpose is to establish a shared understanding of the system before entering the build phase.

Documentation contents:

1. [Problem & Background](01-problem-and-background.md)
2. [Core Concepts & MVP Scope](02-core-concepts-and-mvp-scope.md)
3. [Event Lifecycle](03-event-lifecycle.md)
4. [System Architecture](04-system-architecture.md)
5. [Verification Layer & Asset Status](05-verification-and-asset-status.md)
6. [Onchain Layer & Security Principles](06-onchain-layer-and-security.md)
7. [API, SDK & Webhooks](07-api-sdk-and-webhooks.md)
8. [Glossary](08-glossary.md)

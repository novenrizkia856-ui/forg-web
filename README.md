# FORG Web

Landing page for FORG, the corporate action infrastructure layer for Stock Tokens.

FORG detects corporate actions (dividends, stock splits, trading halts), verifies them
against trusted evidence, and turns verified events into onchain instructions that the
authorized issuer executes. FORG never holds user funds.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole page. All copy lives here, nothing is injected at runtime. |
| `styles.css` | FORG layer on top of the exported layout: palette, contract pill, brand, reveals. |
| `main.js` | Connects the page to `config/contracts.js`. No copy, no layout. |
| `config/contracts.js` | The only file to edit after a deployment. Stays outside the bundle. |
| `lib/` | Pure modules: keccak, ABI encode and decode, contract state, JSON RPC reads, wallet. |
| `public/` | Files copied to the site root: `assets/` (hashed images and fonts), `og.png`. |
| `abi/ForgCore.json` | The deployed contract ABI, exported from the contracts repo. |
| `brand-assets/` | Artwork carrying the FORG mark. Source for the files in `public/assets/`. |
| `reference-assets/` | The original artwork, kept only for diffing. Not shipped. |
| `scripts/rebrand-images.py` | Regenerates `brand-assets/` from `reference-assets/`. Needs Pillow and numpy. |
| `lib/reveal.js` | Section reveals and the event ticker, rebuilt from the reference motion. |

## Design

The palette follows base.org: white page, `#171717` text, Base blue `#0000FF`
accent with `#0052FF` on hover. Two framer design tokens carry accent and ink
through the whole export, so `styles.css` recolours the page by overriding
those two variables.

The artwork is recoloured in the files themselves rather than with a CSS
filter. `scripts/rebrand-images.py` moves only the orange brand hue onto blue,
so the red, green and blue chart lines inside the dashboard mockups survive
untouched. It also swaps the reference brand glyph for the FORG mark at the
same position and size.

### Motion

Reveal values are taken from the reference page rather than invented:

| Element | From | Duration |
|---|---|---|
| Section titles, card rows, footer columns, hero buttons | `translateY(40px)`, opacity 0 | 1100ms |
| The three process cards | `translateY(80px)`, staggered 100ms | 1100ms |
| Hero artwork | `translateY(180px)` | 1100ms |
| Headings | per word, `translateY(20px)`, `blur(10px)`, staggered 50ms | 600ms |
| Paragraphs | one block, `blur(10px)`, `translateY(20px)` (10px in the closing block) | 620ms |
| Event rows | continuous, 50 px/s, opposite directions | loops |

Blocks carry their start state inline and `main.js` reveals them with an
IntersectionObserver. A `<noscript>` rule shows everything when scripting is
off, and `prefers-reduced-motion` disables the whole set.

## Local development

```bash
npm install
npm run dev
```

## Production checks

```bash
npm run audit
npm test
npm run build
```

`npm run audit` fails on dashes in visible copy and on any wording left over from the
template the layout came from. `npm test` covers the contract state machine, keccak
selectors, ABI decoding, the read path against a stubbed RPC, and the wallet helpers.

### Assets

Images and fonts live as files under `public/assets/`, named by a hash of their own
contents, and `index.html` references them by URL. They were inlined as base64 data URIs
in the original export, which made the document 10.9 MB and impossible to cache; pulling
them out took it to 248 kB. Anything regenerated from that export has to be run through
the same extraction, or the document balloons again.

Because the names are content hashes, `vercel.json` serves `/assets/*` as immutable for a
year. `config/contracts.js` is deliberately excluded from that: it is edited in place on
the deployed site, so it must revalidate every time.

## Connecting the contracts

Nothing in the page assumes a deployment. Every value degrades to static copy, so the
site is publishable today and becomes live the moment the addresses are filled in.

### 1. Fill in `config/contracts.js`

```js
window.CONTRACT_CONFIG = {
  network: "RH Chain",
  chainId: 1234,
  rpcUrl: "https://rpc.rhchain.example",
  explorerUrl: "https://explorer.rhchain.example",
  forgTokenAddress: "",
  forgCoreAddress: "0x...",
  links: {
    dapp: "",
    docs: "https://docs.forg.example",
    x: "https://x.com/forg",
  },
  reads: [],
};
```

What each field turns on:

| Field | Effect on the page |
|---|---|
| `network` | The chip in the contract pill. Empty shows `Network pending`. |
| `forgTokenAddress` | The shortened address and the copy button. Empty shows `Coming Soon`. |
| `forgCoreAddress` | Target for the `reads` below. Never shown in the contract pill. |
| `explorerUrl` | Makes the address clickable and enables the footer `Contract` link. |
| `rpcUrl` | Required before any `reads` entry runs. |
| `links.docs` | Enables the `Docs` item in the top menu. Empty leaves it dimmed and inert. |
| `links.x` | Enables the footer social link, same rule. |

The built site keeps this file unbundled at `dist/config/contracts.js`, so a deployment
can be wired up by editing that one file, with no rebuild.

The contract address sits in the hero, directly under the sub header.

Leave `links.dapp` empty to use the integrated wallet experience. Add the
standalone dapp URL later and both Launch dapp buttons will open it automatically.

### 2. Optional: live numbers from the contract

Two slots on the page can show real contract values instead of static copy. They are
marked in `index.html` with `data-forg-read`:

| Slot | Where it is |
|---|---|
| `assets` | The counter on the Live Event Status card. |
| `events` | The pill on the Evidence and Audit card. |

Bind them by adding entries to `reads`:

```js
reads: [
  {
    slot: "events",
    contract: "forgCore",          // ForgCore is the only FORG contract
    signature: "eventCount()",
    returns: "uint256",            // uint256 | bool | address | string
    template: "{value} events",    // optional
  },
],
```

The selector is derived from the signature with a local keccak implementation, so no
ABI file and no wallet library are needed. Calls are `eth_call` only: the page can
read state and can never send a transaction, which matches the non custodial design.

A read that is missing, misconfigured, or reverting is logged and skipped, and the
static copy stays on screen. Nothing on the page breaks because a contract is not there.

The ForgCore ABI is checked in at `abi/ForgCore.json` for anything that does need it.
Regenerate it from the contracts repo after a contract change:

```bash
node -e "require('fs').writeFileSync('abi/ForgCore.json',JSON.stringify(require('../forg-contracts/out/ForgCore.sol/ForgCore.json').abi,null,2)+'\n')"
```

### 3. Connect a wallet

The contract pill carries a Connect button, added from `main.js` so the exported markup
stays untouched. It prefers an injected wallet (`window.ethereum`) and falls back to the
WalletConnect v2 QR flow, whose bundle is imported on demand and never costs a visitor
who does not click it.

```js
walletConnectProjectId: "...",   // public client id from cloud.reown.com
preferWalletConnect: false,      // true forces the QR flow even with a browser wallet
```

The button hides itself when neither transport can work. Once connected it shows the
account, and if the wallet is on another chain it turns into `Switch network`, offering
`wallet_switchEthereumChain` and adding the chain first when the wallet does not know it.

This is read only, like the rest of the page: `lib/wallet.js` never builds, signs or
sends a transaction. Every write on ForgCore is role gated and performed by FORG
operators, so there is nothing here for a visitor's wallet to sign.

### 4. Content security policy

`index.html` carries its own CSP meta tag. `connect-src` allows `https:` and `wss:`, so a
public RPC endpoint and the WalletConnect relay both work. A local node over plain http
needs that directive widened.

The WalletConnect modal also needs `img-src https: blob:` for wallet icons and the QR,
`font-src https://fonts.reown.com` for its typography, and `frame-src` entries for its
Verify endpoints. Those are the only reasons the policy is wider than `'self'`.

## Vercel

`vercel.json` builds with Vite and publishes `dist`. It also sets cache headers (immutable
for hashed assets, revalidate for the contract config and the document) and the baseline
security headers: `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`
and `X-Frame-Options`.

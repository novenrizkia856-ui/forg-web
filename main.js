/**
 * Runtime wiring for the FORG landing page.
 *
 * All copy lives in index.html. This file only connects the page to whatever
 * is in config/contracts.js, so the same build works before and after the
 * contracts are deployed.
 */
import { getContractState, getLinkTargets } from "./lib/contract-state.js";
import { runReads } from "./lib/forg-chain.js";
import { createPanel } from "./lib/panel.js";
import { getRegistryTargets } from "./lib/registry.js";
import { startInfrastructureOrbit, startReveals, startTickers } from "./lib/reveal.js";
import { canConnect, createWalletController, shortenAddress } from "./lib/wallet.js";

const config = window.CONTRACT_CONFIG || {};
const wallet = canConnect(config) ? createWalletController(config) : null;

/**
 * Whether Launch dapp has somewhere to go.
 *
 * The panel reads public view functions, so a contract and an endpoint are
 * enough on their own: no wallet required, and no wallet asked for.
 */
const canOpenPanel = getRegistryTargets(config).readable || Boolean(wallet);

function fillContractBar() {
  const bar = document.querySelector("[data-forg-contract-bar]");
  if (!bar) return;

  const state = getContractState(config);
  const network = bar.querySelector("[data-forg-network]");
  const address = bar.querySelector("[data-forg-address]");
  const button = bar.querySelector("[data-forg-copy]");
  const label = bar.querySelector("[data-forg-copy-label]");

  if (network) network.textContent = state.networkLabel;

  if (address) {
    address.textContent = state.displayAddress;
    address.classList.toggle("is-idle", !state.hasAddress);
    if (state.hasAddress) address.title = state.fullAddress;
    if (state.explorerUrl) {
      address.href = state.explorerUrl;
      address.target = "_blank";
      address.rel = "noopener";
    }
  }

  if (!button || !state.hasAddress) return;

  button.disabled = false;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.fullAddress);
      label.textContent = "Copied";
    } catch {
      label.textContent = "Copy failed";
    }
    window.setTimeout(() => {
      label.textContent = "Copy";
    }, 1600);
  });
}

/**
 * Add a Connect button to the contract pill.
 *
 * Built here rather than in index.html so the exported markup stays untouched,
 * and so the button simply never appears when the config cannot support it.
 * The pill's existing button styling applies to it automatically.
 */
function fillWalletButton() {
  const bar = document.querySelector("[data-forg-contract-bar]");
  if (!bar || !wallet) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.forgConnect = "";
  button.className = "forg-ca-connect";

  const label = document.createElement("span");
  button.append(label);
  bar.append(button);

  const networkLabel = (config.network || "").trim() || "the FORG chain";

  wallet.subscribe((state) => {
    const connected = state.status === "connected" && state.address;
    const wrongChain = connected && !wallet.isOnTargetChain();

    button.disabled = state.status === "connecting";
    button.classList.toggle("is-wrong-chain", Boolean(wrongChain));

    if (state.status === "connecting") label.textContent = "Connecting";
    else if (wrongChain) label.textContent = "Switch network";
    else if (connected) label.textContent = shortenAddress(state.address);
    else label.textContent = "Connect";

    button.title = wrongChain
      ? `Connected on chain ${state.chainId}. Click to switch to ${networkLabel}.`
      : connected
        ? `${state.address} — click to disconnect`
        : "Connect a wallet to view FORG on chain";

    if (state.error) console.warn("FORG wallet:", state.error);
  });

  button.addEventListener("click", () => {
    const state = wallet.getState();
    if (state.status === "connecting") return;
    if (state.status !== "connected") return void wallet.connect();
    if (!wallet.isOnTargetChain()) return void wallet.switchChain();
    wallet.disconnect();
  });
}

function wireLinks() {
  const targets = getLinkTargets(config);

  document.querySelectorAll("[data-forg-link]").forEach((link) => {
    const key = link.dataset.forgLink;
    const href = targets[key];
    if (key === "dapp" && !href && canOpenPanel) return;
    if (!href) {
      /* the export sets opacity inline on these anchors, so dim them the
         same way rather than from the stylesheet */
      link.classList.add("is-idle");
      link.style.opacity = "0.45";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      return;
    }
    link.href = href;

    /* Only an outbound link earns a tab of its own. The docs now live on this
       same site, and sending a visitor to a new tab for an internal page loses
       them their back button. */
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }

    link.classList.remove("is-idle");
    link.style.removeProperty("opacity");
    link.style.removeProperty("pointer-events");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");
  });
}

/**
 * Make the dapp impossible to miss, and impossible to get lost in.
 *
 * A configured standalone URL opens normally. Until that exists, these
 * launchers open the registry panel, which reads ForgCore over plain RPC.
 * They do not ask for a wallet first: the panel shows public state, so a
 * connect prompt in front of it would gate an unlocked door. The label never
 * changes either, because a button that renames itself to "Dapp connected"
 * promises a destination the visitor has not actually arrived at.
 */
function wireDappLaunchers() {
  const launchers = document.querySelectorAll('[data-forg-link="dapp"]');
  if (!launchers.length) return;

  const dappUrl = getLinkTargets(config).dapp;
  if (dappUrl || !canOpenPanel) return;

  const panel = createPanel(config, wallet);

  launchers.forEach((link) => {
    link.classList.remove("is-idle");
    link.style.removeProperty("opacity");
    link.style.removeProperty("pointer-events");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");

    link.addEventListener("click", (event) => {
      event.preventDefault();
      panel.open();
    });
  });
}

/**
 * Replace the static numbers with live contract values, where a read has been
 * configured. A missing or failing read simply leaves the static copy alone.
 */
async function fillLiveReads() {
  const slots = document.querySelectorAll("[data-forg-read]");
  if (!slots.length) return;

  const results = await runReads(config, {
    onError: (entry, error) => console.warn(`FORG read "${entry.slot}" skipped:`, error.message),
  });

  slots.forEach((slot) => {
    const value = results[slot.dataset.forgRead];
    if (value) slot.textContent = value;
  });
}

fillContractBar();
fillWalletButton();
wireLinks();
wireDappLaunchers();
fillLiveReads();
startReveals();
startTickers();
startInfrastructureOrbit();

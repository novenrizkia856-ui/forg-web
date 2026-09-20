/**
 * The FORG panel: what "Launch dapp" actually opens.
 *
 * Built here rather than in index.html for the same reason the Connect button
 * is, so the exported markup stays untouched and the panel simply never
 * appears when the config cannot support it.
 *
 * It opens without a wallet. Every figure it shows is a public view call, so
 * asking a visitor to connect before they can see anything would be a gate in
 * front of an unlocked door. Connecting is offered at the bottom, for the
 * wallet the visitor wants to bring, never as a condition of entry.
 */
import { readRegistry, describeRegistry, getRegistryTargets } from "./registry.js";
import { shortenAddress } from "./wallet.js";

const PLACEHOLDER = "—";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** One labelled figure in the panel body. */
function statRow(label, hint) {
  const row = el("div", "forg-panel-stat");
  const head = el("div", "forg-panel-stat-head");
  head.append(el("span", "forg-panel-stat-label", label));
  if (hint) head.append(el("span", "forg-panel-stat-hint", hint));
  const value = el("strong", "forg-panel-stat-value", PLACEHOLDER);
  row.append(head, value);
  return { row, value };
}

/**
 * @param {object} config window.CONTRACT_CONFIG
 * @param {object|null} wallet the controller from createWalletController, or null
 * @returns {{open: Function, close: Function, isOpen: Function}}
 */
export function createPanel(config = {}, wallet = null) {
  const targets = getRegistryTargets(config);

  /* ------------------------------------------------------------- structure */

  const root = el("div", "forg-panel");
  root.dataset.forgPanel = "";
  root.hidden = true;

  const scrim = el("div", "forg-panel-scrim");
  scrim.dataset.forgPanelClose = "";

  const card = el("section", "forg-panel-card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "forg-panel-title");
  card.tabIndex = -1;

  /* header */
  const header = el("header", "forg-panel-header");
  const heading = el("div");
  heading.append(el("p", "forg-panel-eyebrow", "FORG Registry"));
  const title = el("h2", "forg-panel-title", targets.network);
  title.id = "forg-panel-title";
  heading.append(title);

  const close = el("button", "forg-panel-close");
  close.type = "button";
  close.dataset.forgPanelClose = "";
  close.setAttribute("aria-label", "Close the registry panel");
  close.textContent = "×";
  header.append(heading, close);

  /* status line */
  const status = el("div", "forg-panel-status");
  const statusDot = el("span", "forg-panel-dot");
  statusDot.setAttribute("aria-hidden", "true");
  const statusLabel = el("span", "forg-panel-status-label", "Checking");
  status.append(statusDot, statusLabel);
  const statusDetail = el("p", "forg-panel-detail", "Reading the contract…");

  /* contract address */
  const contractRow = el("div", "forg-panel-contract");
  contractRow.append(el("span", "forg-panel-stat-label", "ForgCore"));
  const addressNode = targets.explorerUrl ? el("a", "forg-panel-address") : el("span", "forg-panel-address");
  addressNode.textContent = targets.shortAddress || "Not configured";
  if (targets.address) addressNode.title = targets.address;
  if (targets.explorerUrl) {
    addressNode.href = targets.explorerUrl;
    addressNode.target = "_blank";
    addressNode.rel = "noopener";
  }
  contractRow.append(addressNode);

  /* figures */
  const assets = statRow("Assets registered", "assetCount()");
  const events = statRow("Corporate actions", "eventCount()");
  const stats = el("div", "forg-panel-stats");
  stats.append(assets.row, events.row);

  /* wallet footer, only when a wallet could connect at all */
  const footer = el("footer", "forg-panel-footer");
  const footerNote = el(
    "p",
    "forg-panel-note",
    "Everything above is public, read straight from the chain. A wallet is optional.",
  );
  footer.append(footerNote);

  let connectButton = null;
  if (wallet) {
    connectButton = el("button", "forg-panel-connect");
    connectButton.type = "button";
    connectButton.append(el("span", null, "Connect wallet"));
    footer.append(connectButton);
  }

  card.append(header, status, statusDetail, contractRow, stats, footer);
  root.append(scrim, card);

  /* ------------------------------------------------------------- behaviour */

  let lastFocused = null;
  let loaded = false;

  function render(registry) {
    const described = describeRegistry(registry);
    statusDot.dataset.tone = described.tone;
    statusLabel.textContent = described.label;
    statusDetail.textContent = described.detail;
    assets.value.textContent = registry.assets === null ? PLACEHOLDER : String(registry.assets);
    events.value.textContent = registry.events === null ? PLACEHOLDER : String(registry.events);
  }

  /** Read once per page, then keep showing what came back. */
  async function load() {
    if (loaded) return;
    loaded = true;
    render(await readRegistry(config));
  }

  function onKeydown(event) {
    if (event.key === "Escape") close_();
  }

  function open() {
    if (!root.hidden) return;
    lastFocused = document.activeElement;
    root.hidden = false;
    document.body.classList.add("forg-panel-open");
    document.addEventListener("keydown", onKeydown);
    card.focus();
    load();
  }

  function close_() {
    if (root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("forg-panel-open");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  root.querySelectorAll("[data-forg-panel-close]").forEach((node) => {
    node.addEventListener("click", close_);
  });

  if (wallet && connectButton) {
    const label = connectButton.firstElementChild;

    wallet.subscribe((state) => {
      const connected = state.status === "connected" && state.address;
      const wrongChain = connected && !wallet.isOnTargetChain();

      connectButton.disabled = state.status === "connecting";
      connectButton.classList.toggle("is-wrong-chain", Boolean(wrongChain));

      if (state.status === "connecting") label.textContent = "Connecting…";
      else if (wrongChain) label.textContent = `Switch to ${targets.network}`;
      else if (connected) label.textContent = `${shortenAddress(state.address)} — disconnect`;
      else label.textContent = "Connect wallet";
    });

    connectButton.addEventListener("click", () => {
      const state = wallet.getState();
      if (state.status === "connecting") return;
      if (state.status !== "connected") return void wallet.connect();
      if (!wallet.isOnTargetChain()) return void wallet.switchChain();
      wallet.disconnect();
    });
  }

  document.body.append(root);

  return { open, close: close_, isOpen: () => !root.hidden, element: root };
}

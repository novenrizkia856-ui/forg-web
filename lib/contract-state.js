/**
 * Everything the page needs to know about the deployment, derived from
 * config/contracts.js. Pure functions so the states can be tested without a
 * browser or a chain.
 */

const text = (value) => (typeof value === "string" ? value.trim() : "");

const shorten = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

/**
 * State of the contract bar.
 *
 * Before deployment every field still has a sensible value, so the bar reads
 * "Coming Soon" instead of rendering an empty slot.
 */
export function getContractState(config = {}) {
  const fullAddress = text(config.forgCoreAddress);
  const network = text(config.network);
  const explorer = text(config.explorerUrl).replace(/\/+$/, "");
  const hasAddress = fullAddress.length > 0;

  return {
    fullAddress,
    hasAddress,
    displayAddress: hasAddress ? shorten(fullAddress) : "Coming Soon",
    networkLabel: network || "Network pending",
    explorerUrl: hasAddress && explorer ? `${explorer}/address/${fullAddress}` : "",
  };
}

/** True once a read call has somewhere to go. */
export function canReadChain(config = {}) {
  return text(config.rpcUrl).length > 0 && text(config.forgCoreAddress).length > 0;
}

/**
 * Resolve the address a read entry points at, or "" when it is not deployed.
 *
 * ForgCore is the only FORG contract: there is no FORG token. A read entry naming
 * anything else resolves to "", so a stale config is skipped with a warning rather than
 * quietly reading the wrong address.
 */
export function resolveContractAddress(config = {}, name = "forgCore") {
  if (name && name !== "forgCore") return "";
  return text(config.forgCoreAddress);
}

/**
 * Outbound links, keyed by the data-forg-link attribute in index.html.
 * An empty href means the link should stay inert rather than go nowhere.
 */
export function getLinkTargets(config = {}) {
  const links = config.links || {};
  const state = getContractState(config);
  return {
    docs: text(links.docs),
    x: text(links.x),
    explorer: state.explorerUrl,
  };
}

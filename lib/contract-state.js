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
 * The bar shows the FORG token address, not ForgCore. The token does not exist
 * yet, so `forgTokenAddress` stays empty and the bar reads "Coming Soon" until
 * there is a token to point at.
 */
export function getContractState(config = {}) {
  const fullAddress = text(config.forgTokenAddress);
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
  return (
    text(config.rpcUrl).length > 0 &&
    text(config.forgCoreAddress).length + text(config.forgTokenAddress).length > 0
  );
}

/**
 * Resolve the address a read entry points at, or "" when it is not deployed.
 *
 * Reads run against ForgCore; the token slot stays here for whenever a token
 * exists, and resolves to "" until then so the read is skipped rather than sent
 * to an empty address.
 */
export function resolveContractAddress(config = {}, name = "forgCore") {
  if (name === "forgToken") return text(config.forgTokenAddress);
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
    dapp: text(links.dapp),
    docs: text(links.docs),
    explorer: state.explorerUrl,
  };
}

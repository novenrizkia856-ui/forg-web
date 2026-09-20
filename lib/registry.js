/**
 * The ForgCore state the panel puts on screen.
 *
 * Everything a visitor needs from ForgCore is a view function, so this reads
 * the chain over plain JSON RPC and never asks for a wallet. That is the whole
 * reason the panel can open on the first click: there is nothing here to sign.
 *
 * Each field is read on its own. One reverting call leaves the rest intact,
 * because a panel that shows two of three numbers is worth more than a panel
 * that shows an error.
 */
import { createRpcClient, runRead } from "./forg-chain.js";
import { getContractState, resolveContractAddress } from "./contract-state.js";

const text = (value) => (typeof value === "string" ? value.trim() : "");

/** The view functions the panel reads, in the order it shows them. */
const FIELDS = [
  { key: "paused", signature: "paused()", returns: "bool" },
  { key: "assets", signature: "assetCount()", returns: "uint256" },
  { key: "events", signature: "eventCount()", returns: "uint256" },
];

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Where the panel points, derived from the same config as the rest of the page.
 * Kept separate from the reads so the panel can render its header before the
 * first RPC round trip has come back.
 */
export function getRegistryTargets(config = {}) {
  const address = resolveContractAddress(config, "forgCore");
  const explorer = text(config.explorerUrl).replace(/\/+$/, "");
  const state = getContractState(config);

  return {
    address,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "",
    explorerUrl: address && explorer ? `${explorer}/address/${address}` : "",
    network: state.networkLabel,
    /* No address and no endpoint means there is nothing to read; the panel says
       so rather than spinning on a request it can never make. */
    readable: Boolean(address && text(config.rpcUrl)),
  };
}

/**
 * Read ForgCore into the shape the panel renders.
 *
 * @param {object} config window.CONTRACT_CONFIG
 * @param {object} [options]
 * @param {Function} [options.client] a stand in for the RPC client, for tests
 * @returns {Promise<object>} never rejects; failures come back as `errors`
 */
export async function readRegistry(config = {}, { client } = {}) {
  const targets = getRegistryTargets(config);
  const result = { ...targets, paused: null, assets: null, events: null, errors: {} };

  if (!targets.readable) {
    result.errors.config = "no contract address or RPC endpoint configured";
    return result;
  }

  const call = client || createRpcClient(text(config.rpcUrl));

  await Promise.all(
    FIELDS.map(async (field) => {
      try {
        const value = await runRead(call, config, { ...field, contract: "forgCore" });
        result[field.key] = field.returns === "bool" ? value === "true" : toCount(value);
      } catch (error) {
        result.errors[field.key] = error.message || "read failed";
      }
    }),
  );

  return result;
}

/**
 * What the panel should say about a set of readings.
 *
 * A live contract with nothing in it yet is the expected state today, and it
 * reads very differently from a contract that could not be reached at all.
 * Keeping that distinction here means the panel never shows an empty registry
 * and a failed connection the same way.
 */
export function describeRegistry(registry = {}) {
  const { paused, assets, events, errors = {} } = registry;
  const reachable = paused !== null || assets !== null || events !== null;

  if (!reachable) {
    return {
      tone: "down",
      label: "Unreachable",
      detail: errors.config
        ? "No contract address configured yet."
        : "Could not reach the network. The numbers below are unavailable.",
    };
  }

  if (paused === true) {
    return {
      tone: "paused",
      label: "Paused",
      detail: "The registry is live but currently paused by its operators.",
    };
  }

  if (assets === 0 && events === 0) {
    return {
      tone: "empty",
      label: "Active",
      detail: "The registry is live and accepting records. No corporate action has been filed yet.",
    };
  }

  return {
    tone: "live",
    label: "Active",
    detail: "The registry is live. Figures below are read straight from the contract.",
  };
}

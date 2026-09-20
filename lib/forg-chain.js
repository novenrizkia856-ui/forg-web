/**
 * Read only chain access over plain JSON RPC.
 *
 * No wallet, no library: the landing page only ever calls view functions, so
 * a fetch against a public endpoint is all it needs. Nothing here can move
 * funds, which matches the non custodial design of FORG itself.
 */
import { encodeCall, decodeResult, formatUnits } from "./abi.js";
import { resolveContractAddress } from "./contract-state.js";

export function createRpcClient(rpcUrl, { timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
  let nextId = 1;

  return async function call(method, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`rpc ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || "rpc error");
      return payload.result;
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Run one configured read entry and return the string to display. */
export async function runRead(client, config, entry) {
  const address = resolveContractAddress(config, entry.contract);
  if (!address) throw new Error(`${entry.contract || "forgCore"} address is not set`);

  const data = encodeCall(entry.signature, entry.args || []);
  const raw = await client("eth_call", [{ to: address, data }, "latest"]);
  if (!raw || raw === "0x") throw new Error(`${entry.signature} returned nothing`);

  const value = decodeResult(entry.returns || "uint256", raw);
  const shown = typeof value === "bigint" ? formatUnits(value, entry.decimals || 0) : String(value);
  return entry.template ? entry.template.replace("{value}", shown) : shown;
}

/**
 * Run every configured read and hand the results back as a slot map.
 * A failing entry is skipped so the static copy stays on screen.
 */
export async function runReads(config, { onError } = {}) {
  const entries = Array.isArray(config.reads) ? config.reads : [];
  const rpcUrl = (config.rpcUrl || "").trim();
  if (!entries.length || !rpcUrl) return {};

  const client = createRpcClient(rpcUrl);
  const results = {};

  await Promise.all(
    entries.map(async (entry) => {
      try {
        results[entry.slot] = await runRead(client, config, entry);
      } catch (error) {
        if (onError) onError(entry, error);
      }
    }),
  );

  return results;
}

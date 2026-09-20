import test from "node:test";
import assert from "node:assert/strict";
import { getRegistryTargets, readRegistry, describeRegistry } from "../lib/registry.js";

const CORE = "0x8FB36E0EBa99b6D415c5953C192DC75Fd822925e";

const RH = {
  network: "Robinhood Chain",
  chainId: 4663,
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  forgCoreAddress: CORE,
  forgTokenAddress: "",
};

const word = (value) => `0x${BigInt(value).toString(16).padStart(64, "0")}`;

/**
 * A stand in for the RPC client: answers eth_call by selector, so a test can
 * say what the contract returns without a network.
 */
function stubClient(bySelector) {
  return async (method, params) => {
    assert.equal(method, "eth_call");
    const selector = params[0].data.slice(0, 10);
    if (!(selector in bySelector)) throw new Error(`unexpected selector ${selector}`);
    const answer = bySelector[selector];
    if (answer instanceof Error) throw answer;
    return answer;
  };
}

/* selectors the panel reads, from lib/abi.js */
const PAUSED = "0x5c975abb";
const ASSET_COUNT = "0xeafe7a74";
const EVENT_COUNT = "0x71be2e4a";

test("targets point at ForgCore and its explorer page", () => {
  const targets = getRegistryTargets(RH);

  assert.equal(targets.address, CORE);
  assert.equal(targets.shortAddress, "0x8FB3...925e");
  assert.equal(targets.explorerUrl, `https://robinhoodchain.blockscout.com/address/${CORE}`);
  assert.equal(targets.network, "Robinhood Chain");
  assert.equal(targets.readable, true);
});

test("a config with nothing deployed is not readable", () => {
  assert.equal(getRegistryTargets({}).readable, false);
  assert.equal(getRegistryTargets({ ...RH, forgCoreAddress: "" }).readable, false);
  assert.equal(getRegistryTargets({ ...RH, rpcUrl: "" }).readable, false);
});

test("the live contract reads into the shape the panel renders", async () => {
  const registry = await readRegistry(RH, {
    client: stubClient({ [PAUSED]: word(0), [ASSET_COUNT]: word(12), [EVENT_COUNT]: word(340) }),
  });

  assert.equal(registry.paused, false);
  assert.equal(registry.assets, 12);
  assert.equal(registry.events, 340);
  assert.deepEqual(registry.errors, {});
});

test("one failing read does not empty the whole panel", async () => {
  const registry = await readRegistry(RH, {
    client: stubClient({
      [PAUSED]: word(0),
      [ASSET_COUNT]: new Error("execution reverted"),
      [EVENT_COUNT]: word(7),
    }),
  });

  assert.equal(registry.paused, false);
  assert.equal(registry.assets, null, "the failing figure is the only one missing");
  assert.equal(registry.events, 7);
  assert.equal(registry.errors.assets, "execution reverted");
});

test("readRegistry reports rather than throws when the chain is unreachable", async () => {
  const registry = await readRegistry(RH, {
    client: async () => {
      throw new Error("rpc 503");
    },
  });

  assert.equal(registry.paused, null);
  assert.equal(registry.assets, null);
  assert.equal(registry.events, null);
  assert.equal(registry.errors.events, "rpc 503");
});

test("an unconfigured deployment is described, not read", async () => {
  const registry = await readRegistry({});
  assert.equal(registry.errors.config, "no contract address or RPC endpoint configured");
  assert.equal(describeRegistry(registry).label, "Unreachable");
});

test("a live registry with nothing in it reads as active, not broken", () => {
  const described = describeRegistry({ paused: false, assets: 0, events: 0, errors: {} });

  assert.equal(described.tone, "empty");
  assert.equal(described.label, "Active");
  assert.match(described.detail, /No corporate action has been filed yet/);
});

test("a registry holding records reads as live", () => {
  const described = describeRegistry({ paused: false, assets: 3, events: 11, errors: {} });

  assert.equal(described.tone, "live");
  assert.equal(described.label, "Active");
});

test("a paused registry says so instead of showing its figures as normal", () => {
  const described = describeRegistry({ paused: true, assets: 3, events: 11, errors: {} });

  assert.equal(described.tone, "paused");
  assert.equal(described.label, "Paused");
});

test("an unreachable chain is never confused with an empty registry", () => {
  const described = describeRegistry({ paused: null, assets: null, events: null, errors: { events: "rpc 503" } });

  assert.equal(described.tone, "down");
  assert.equal(described.label, "Unreachable");
});

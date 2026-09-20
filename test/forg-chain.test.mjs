import test from "node:test";
import assert from "node:assert/strict";
import { runReads } from "../lib/forg-chain.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef1234abcd";
const word = (n) => "0x" + n.toString(16).padStart(64, "0");

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    return { ok: true, json: async () => ({ jsonrpc: "2.0", id: body.id, result: handler(body) }) };
  };
  return calls;
}

const baseConfig = {
  rpcUrl: "https://rpc.example",
  forgCoreAddress: ADDRESS,
  reads: [{ slot: "events", contract: "forgCore", signature: "verifiedEventCount()", returns: "uint256" }],
};

test("no reads and no endpoint means no requests", async () => {
  const calls = stubFetch(() => word(1));

  assert.deepEqual(await runReads({}), {});
  assert.deepEqual(await runReads({ rpcUrl: "https://rpc.example" }), {});
  assert.deepEqual(await runReads({ reads: baseConfig.reads }), {});
  assert.equal(calls.length, 0);
});

test("a configured read reaches the contract and comes back formatted", async () => {
  const calls = stubFetch(() => word(128));

  const results = await runReads({
    ...baseConfig,
    reads: [{ ...baseConfig.reads[0], template: "{value} verified" }],
  });

  assert.deepEqual(results, { events: "128 verified" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.method, "eth_call");
  assert.equal(calls[0].body.params[0].to, ADDRESS);
  assert.equal(calls[0].body.params[1], "latest");
});

test("a failing read is skipped instead of breaking the page", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const skipped = [];

  const results = await runReads(baseConfig, { onError: (entry) => skipped.push(entry.slot) });

  assert.deepEqual(results, {});
  assert.deepEqual(skipped, ["events"]);
});

test("a read pointed at an undeployed contract is skipped", async () => {
  stubFetch(() => word(1));
  const skipped = [];

  const results = await runReads(
    { ...baseConfig, forgCoreAddress: "", reads: baseConfig.reads },
    { onError: (entry, error) => skipped.push(error.message) },
  );

  assert.deepEqual(results, {});
  assert.match(skipped[0], /address is not set/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  getContractState,
  getLinkTargets,
  canReadChain,
  resolveContractAddress,
} from "../lib/contract-state.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef1234abcd";

test("empty core address stays disabled", () => {
  const state = getContractState({ forgCoreAddress: "", network: "" });

  assert.equal(state.hasAddress, false);
  assert.equal(state.displayAddress, "Coming Soon");
  assert.equal(state.networkLabel, "Network pending");
  assert.equal(state.explorerUrl, "");
});

test("a missing config still produces a usable state", () => {
  const state = getContractState();

  assert.equal(state.hasAddress, false);
  assert.equal(state.displayAddress, "Coming Soon");
});

test("deployed core address becomes short and active", () => {
  const state = getContractState({ forgCoreAddress: ADDRESS, network: "RH Chain" });

  assert.equal(state.hasAddress, true);
  assert.equal(state.fullAddress, ADDRESS);
  assert.equal(state.displayAddress, "0x1234...abcd");
  assert.equal(state.networkLabel, "RH Chain");
});

test("explorer link appears only once both parts are configured", () => {
  const withoutExplorer = getContractState({ forgCoreAddress: ADDRESS, network: "RH Chain" });
  assert.equal(withoutExplorer.explorerUrl, "");

  const withExplorer = getContractState({
    forgCoreAddress: ADDRESS,
    network: "RH Chain",
    explorerUrl: "https://explorer.example/",
  });
  assert.equal(withExplorer.explorerUrl, `https://explorer.example/address/${ADDRESS}`);
});

test("chain reads need both an endpoint and an address", () => {
  assert.equal(canReadChain({}), false);
  assert.equal(canReadChain({ rpcUrl: "https://rpc.example" }), false);
  assert.equal(canReadChain({ rpcUrl: "https://rpc.example", forgCoreAddress: ADDRESS }), true);
});

test("a read entry resolves to ForgCore, and to nothing else", () => {
  const config = { forgCoreAddress: ADDRESS };

  assert.equal(resolveContractAddress(config, "forgCore"), ADDRESS);
  assert.equal(resolveContractAddress(config), ADDRESS);
  assert.equal(resolveContractAddress({}, "forgCore"), "");

  // There is no FORG token. A stale entry resolves to "" so the read is skipped.
  assert.equal(resolveContractAddress(config, "forgToken"), "");
});

test("unconfigured links stay empty so the page can mark them inert", () => {
  const targets = getLinkTargets({ links: { docs: "https://docs.example" } });

  assert.equal(targets.docs, "https://docs.example");
  assert.equal(targets.x, "");
  assert.equal(targets.explorer, "");
});

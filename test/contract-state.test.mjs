import test from "node:test";
import assert from "node:assert/strict";
import {
  getContractState,
  getLinkTargets,
  canReadChain,
  resolveContractAddress,
} from "../lib/contract-state.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef1234abcd";

test("empty token address stays disabled", () => {
  const state = getContractState({ forgTokenAddress: "", network: "" });

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

test("deployed token address becomes short and active", () => {
  const state = getContractState({ forgTokenAddress: ADDRESS, network: "RH Chain" });

  assert.equal(state.hasAddress, true);
  assert.equal(state.fullAddress, ADDRESS);
  assert.equal(state.displayAddress, "0x1234...abcd");
  assert.equal(state.networkLabel, "RH Chain");
});

test("explorer link appears only once both parts are configured", () => {
  const withoutExplorer = getContractState({ forgTokenAddress: ADDRESS, network: "RH Chain" });
  assert.equal(withoutExplorer.explorerUrl, "");

  const withExplorer = getContractState({
    forgTokenAddress: ADDRESS,
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

test("a read entry resolves to the contract it names", () => {
  const config = { forgCoreAddress: ADDRESS, forgTokenAddress: "0xabc" };

  assert.equal(resolveContractAddress(config, "forgCore"), ADDRESS);
  assert.equal(resolveContractAddress(config, "forgToken"), "0xabc");
  assert.equal(resolveContractAddress(config), ADDRESS);
  assert.equal(resolveContractAddress({}, "forgCore"), "");

  // No token deployed: the read is skipped rather than sent to an empty address.
  assert.equal(resolveContractAddress({ forgCoreAddress: ADDRESS }, "forgToken"), "");
});

test("the bar shows the token, not ForgCore", () => {
  // A deployed ForgCore must not light up the contract bar on its own.
  const coreOnly = getContractState({ forgCoreAddress: ADDRESS, network: "Robinhood Chain" });

  assert.equal(coreOnly.hasAddress, false);
  assert.equal(coreOnly.displayAddress, "Coming Soon");
  assert.equal(coreOnly.explorerUrl, "");
});

test("unconfigured links stay empty so the page can mark them inert", () => {
  const targets = getLinkTargets({ links: { docs: "https://docs.example" } });

  assert.equal(targets.docs, "https://docs.example");
  assert.equal(targets.x, "");
  assert.equal(targets.explorer, "");
});

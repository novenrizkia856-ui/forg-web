import test from "node:test";
import assert from "node:assert/strict";
import { toHexChainId, shortenAddress, buildAddChainParams, canConnect } from "../lib/wallet.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef1234abcd";

const RH = {
  network: "Robinhood Chain",
  chainId: 4663,
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  walletConnectProjectId: "test-project-id",
};

test("chain id becomes the hex quantity wallets expect", () => {
  assert.equal(toHexChainId(4663), "0x1237");
  assert.equal(toHexChainId("4663"), "0x1237");
  assert.equal(toHexChainId(1), "0x1");
});

test("an unusable chain id is rejected rather than sent to the wallet", () => {
  assert.throws(() => toHexChainId(0));
  assert.throws(() => toHexChainId(-1));
  assert.throws(() => toHexChainId("abc"));
});

test("addresses shorten the same way the contract bar shortens them", () => {
  assert.equal(shortenAddress(ADDRESS), "0x1234...abcd");
  assert.equal(shortenAddress(""), "");
  assert.equal(shortenAddress("0xabc"), "0xabc");
});

test("add chain params are built from the page config", () => {
  const params = buildAddChainParams(RH);

  assert.equal(params.chainId, "0x1237");
  assert.equal(params.chainName, "Robinhood Chain");
  assert.deepEqual(params.rpcUrls, ["https://rpc.mainnet.chain.robinhood.com"]);
  assert.deepEqual(params.blockExplorerUrls, ["https://robinhoodchain.blockscout.com"]);
  assert.equal(params.nativeCurrency.decimals, 18);
});

test("a trailing slash on the explorer does not leak into the wallet prompt", () => {
  const params = buildAddChainParams({ ...RH, explorerUrl: "https://explorer.example/" });
  assert.deepEqual(params.blockExplorerUrls, ["https://explorer.example"]);
});

test("an explorer-less config still produces a valid add request", () => {
  const params = buildAddChainParams({ ...RH, explorerUrl: "" });
  assert.equal("blockExplorerUrls" in params, false);
  assert.equal(params.chainId, "0x1237");
});

test("an incomplete config yields null instead of a malformed request", () => {
  assert.equal(buildAddChainParams({}), null);
  assert.equal(buildAddChainParams({ chainId: 4663 }), null);
  assert.equal(buildAddChainParams({ rpcUrl: RH.rpcUrl }), null);
  assert.equal(buildAddChainParams({ ...RH, chainId: 0 }), null);
});

test("the connect button only offers itself when it can actually work", () => {
  // No injected wallet in node, so the project id is what decides.
  assert.equal(canConnect(RH), true);
  assert.equal(canConnect({ ...RH, walletConnectProjectId: "" }), false);
  assert.equal(canConnect({ ...RH, chainId: 0 }), false);
  assert.equal(canConnect({}), false);
});

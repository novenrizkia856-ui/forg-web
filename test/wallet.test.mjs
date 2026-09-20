import test from "node:test";
import assert from "node:assert/strict";
import {
  toHexChainId,
  shortenAddress,
  buildAddChainParams,
  canConnect,
  createWalletController,
} from "../lib/wallet.js";

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

/* -------------------------------------------------------------------------- */

/**
 * A stand in for window.ethereum: enough of EIP 1193 to drive the controller,
 * plus a count of the handlers still attached to it.
 */
function fakeInjected({ accounts = [ADDRESS], chainId = "0x1237", failWith = null } = {}) {
  const handlers = new Map();
  return {
    attached: () => [...handlers.values()].reduce((total, fns) => total + fns.length, 0),
    on(event, fn) {
      handlers.set(event, [...(handlers.get(event) || []), fn]);
    },
    removeListener(event, fn) {
      handlers.set(event, (handlers.get(event) || []).filter((entry) => entry !== fn));
    },
    async request({ method }) {
      if (method === "eth_requestAccounts") {
        if (failWith) throw failWith;
        return accounts;
      }
      if (method === "eth_chainId") return chainId;
      return null;
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("reconnecting does not stack listeners on the injected provider", async () => {
  const injected = fakeInjected();
  globalThis.ethereum = injected;
  const wallet = createWalletController(RH);

  for (let i = 0; i < 4; i += 1) {
    await wallet.connect();
    await settle();
    assert.equal(injected.attached(), 3, "one handler per event while connected");
    await wallet.disconnect();
    await settle();
    assert.equal(injected.attached(), 0, "handlers come off again on disconnect");
  }

  delete globalThis.ethereum;
});

test("a wallet prompt the user closes is not reported as an error", async () => {
  const dismissals = [
    Object.assign(new Error("User rejected the request."), { code: 4001 }),
    // what @walletconnect/ethereum-provider throws when its QR modal is closed
    new Error("Connection request reset. Please try again."),
  ];

  for (const dismissal of dismissals) {
    globalThis.ethereum = fakeInjected({ failWith: dismissal });
    const wallet = createWalletController(RH);
    await wallet.connect();
    await settle();

    assert.deepEqual(wallet.getState(), {
      status: "idle",
      address: "",
      chainId: 0,
      transport: "",
      error: "",
    });
  }

  delete globalThis.ethereum;
});

test("a connection that genuinely fails keeps its message", async () => {
  globalThis.ethereum = fakeInjected({ failWith: new Error("wallet is locked") });
  const wallet = createWalletController(RH);
  await wallet.connect();
  await settle();

  assert.equal(wallet.getState().status, "idle");
  assert.equal(wallet.getState().error, "wallet is locked");

  delete globalThis.ethereum;
});

test("the controller reports the connected account and chain", async () => {
  globalThis.ethereum = fakeInjected();
  const wallet = createWalletController(RH);
  await wallet.connect();
  await settle();

  assert.equal(wallet.getState().status, "connected");
  assert.equal(wallet.getState().address, ADDRESS);
  assert.equal(wallet.getState().chainId, 4663);
  assert.equal(wallet.isOnTargetChain(), true);

  delete globalThis.ethereum;
});

test("a wallet left on another chain is reported as off target", async () => {
  globalThis.ethereum = fakeInjected({ chainId: "0x1" });
  const wallet = createWalletController(RH);
  await wallet.connect();
  await settle();

  assert.equal(wallet.getState().status, "connected");
  assert.equal(wallet.isOnTargetChain(), false);

  delete globalThis.ethereum;
});

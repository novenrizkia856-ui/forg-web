/**
 * Wallet connection for the FORG site.
 *
 * Read only by design. This module can connect a wallet, report the account and
 * chain, and ask the wallet to switch to the FORG chain. It never builds, signs
 * or sends a transaction, which matches the non custodial design of ForgCore:
 * every write on that contract is role gated and performed by FORG operators,
 * not by site visitors.
 *
 * Two transports:
 *   - an injected EIP 1193 provider (window.ethereum), preferred when present
 *   - WalletConnect v2, loaded on demand so its bundle never costs a visitor
 *     who does not click Connect
 */

const text = (value) => (typeof value === "string" ? value.trim() : "");

/** 4663 -> "0x1237". Wallet RPC methods take the chain id as a hex quantity. */
export function toHexChainId(chainId) {
  const n = Number(chainId);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`not a chain id: ${chainId}`);
  return `0x${n.toString(16)}`;
}

/** Same shortening the contract bar uses, so an address reads the same everywhere. */
export function shortenAddress(address) {
  const value = text(address);
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

/**
 * Parameters for wallet_addEthereumChain, built from the same config the rest of
 * the page uses. Returns null when the config cannot describe the chain, so the
 * caller can skip the add step instead of sending a malformed request.
 */
export function buildAddChainParams(config = {}) {
  const chainId = Number(config.chainId);
  const rpcUrl = text(config.rpcUrl);
  if (!Number.isInteger(chainId) || chainId <= 0 || !rpcUrl) return null;

  const explorer = text(config.explorerUrl).replace(/\/+$/, "");
  return {
    chainId: toHexChainId(chainId),
    chainName: text(config.network) || `Chain ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: [rpcUrl],
    ...(explorer ? { blockExplorerUrls: [explorer] } : {}),
  };
}

/** True once the config carries enough detail to offer a connect button at all. */
export function canConnect(config = {}) {
  const hasInjected = typeof globalThis.ethereum !== "undefined";
  return Boolean(Number(config.chainId) > 0 && (hasInjected || text(config.walletConnectProjectId)));
}

/* -------------------------------------------------------------------------- */

/**
 * @param {object} config window.CONTRACT_CONFIG
 * @returns a controller with connect / disconnect / subscribe
 */
export function createWalletController(config = {}) {
  const listeners = new Set();
  let provider = null;
  let untrackCurrent = null;
  let state = { status: "idle", address: "", chainId: 0, transport: "", error: "" };

  const targetChainId = Number(config.chainId) || 0;

  function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  }

  /**
   * Wire the EIP 1193 events so the UI follows the wallet rather than guessing.
   *
   * An injected provider is the same window.ethereum object for the life of the
   * page, so these handlers outlive a disconnect unless they are taken off
   * again. Without that, every reconnect stacks another set on the same object
   * and one accountsChanged ends up fanning out to all of them.
   */
  function track(p) {
    untrack();
    if (!p || typeof p.on !== "function") return;

    const handlers = {
      accountsChanged: (accounts) => {
        if (!accounts || accounts.length === 0) return void disconnect();
        setState({ address: accounts[0] });
      },
      chainChanged: (id) => setState({ chainId: Number(id) }),
      disconnect: () => disconnect(),
    };

    const entries = Object.entries(handlers);
    entries.forEach(([event, fn]) => p.on(event, fn));

    const off = ["removeListener", "off"].find((name) => typeof p[name] === "function");
    untrackCurrent = off ? () => entries.forEach(([event, fn]) => p[off](event, fn)) : null;
  }

  /** Drop the handlers track() attached, if the provider lets us. */
  function untrack() {
    if (untrackCurrent) untrackCurrent();
    untrackCurrent = null;
  }

  async function readChainId(p) {
    try {
      return Number(await p.request({ method: "eth_chainId" }));
    } catch {
      return 0;
    }
  }

  /**
   * Ask the wallet to move to the FORG chain, adding it first if the wallet does
   * not know it. A refusal is not an error: the user stays connected on their
   * own chain and the UI says so.
   */
  async function switchChain() {
    if (!provider || !targetChainId) return;
    const hexId = toHexChainId(targetChainId);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (error) {
      // 4902: the wallet has never heard of this chain. Offer to add it.
      const unknownChain = error && (error.code === 4902 || error.code === -32603);
      const params = unknownChain ? buildAddChainParams(config) : null;
      if (!params) return;
      try {
        await provider.request({ method: "wallet_addEthereumChain", params: [params] });
      } catch {
        /* user declined; leave them where they are */
      }
    }
    setState({ chainId: await readChainId(provider) });
  }

  async function connectInjected() {
    const injected = globalThis.ethereum;
    const accounts = await injected.request({ method: "eth_requestAccounts" });
    provider = injected;
    track(provider);
    setState({
      status: "connected",
      address: (accounts && accounts[0]) || "",
      chainId: await readChainId(provider),
      transport: "injected",
      error: "",
    });
  }

  async function connectWalletConnect() {
    const projectId = text(config.walletConnectProjectId);
    if (!projectId) throw new Error("walletConnectProjectId is not set");

    // Loaded on demand: visitors who never connect never pay for this bundle.
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    const params = buildAddChainParams(config);

    provider = await EthereumProvider.init({
      projectId,
      chains: [targetChainId],
      optionalChains: [targetChainId],
      showQrModal: true,
      rpcMap: params ? { [targetChainId]: params.rpcUrls[0] } : undefined,
      metadata: {
        name: "FORG",
        description: "Corporate action infrastructure for Stock Tokens.",
        url: globalThis.location?.origin || "https://forg.xyz",
        icons: [`${globalThis.location?.origin || ""}/mark.svg`],
      },
    });

    await provider.connect();
    track(provider);
    setState({
      status: "connected",
      address: provider.accounts?.[0] || "",
      chainId: Number(provider.chainId) || (await readChainId(provider)),
      transport: "walletconnect",
      error: "",
    });
  }

  async function connect() {
    if (state.status === "connecting") return;
    setState({ status: "connecting", error: "" });

    const preferWalletConnect = Boolean(config.preferWalletConnect);
    const hasInjected = typeof globalThis.ethereum !== "undefined";

    try {
      if (hasInjected && !preferWalletConnect) await connectInjected();
      else await connectWalletConnect();

      if (targetChainId && state.chainId !== targetChainId) await switchChain();
    } catch (error) {
      /* 4001 is the user closing the prompt, and "Connection request reset" is
         what WalletConnect throws when its QR modal is dismissed. Both are a
         choice, not a failure, so neither is worth surfacing. */
      const rejected =
        error && (error.code === 4001 || /reject|denied|closed|request reset/i.test(error.message || ""));

      /* A provider that never finished connecting still holds a relay socket,
         so drop it rather than leave it behind the next attempt. */
      untrack();
      provider = null;

      setState({
        status: "idle",
        address: "",
        chainId: 0,
        transport: "",
        error: rejected ? "" : error.message || "connection failed",
      });
    }
  }

  async function disconnect() {
    try {
      if (provider && typeof provider.disconnect === "function") await provider.disconnect();
    } catch {
      /* the session may already be gone */
    }
    untrack();
    provider = null;
    setState({ status: "idle", address: "", chainId: 0, transport: "", error: "" });
  }

  return {
    connect,
    disconnect,
    switchChain,
    subscribe,
    getState: () => state,
    isOnTargetChain: () => Boolean(targetChainId) && state.chainId === targetChainId,
  };
}

/**
 * FORG contract configuration.
 *
 * This file is deliberately a plain script, not part of the bundle, so the
 * deployed site can be pointed at a contract by editing dist/config/contracts.js
 * without another build.
 *
 * Every field is optional. While a field is empty the page keeps its static
 * copy, so an undeployed contract never shows a broken value.
 */
window.CONTRACT_CONFIG = {
  /* Human readable chain name shown in the contract bar, e.g. "RH Chain". */
  network: "Robinhood Chain",

  /* EIP 155 chain id. Only used for wallet prompts and sanity checks. */
  chainId: 4663,

  /* Public JSON RPC endpoint. Required for the live reads below. */
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",

  /* Block explorer root, e.g. "https://explorer.example". No trailing slash. */
  explorerUrl: "https://robinhoodchain.blockscout.com",

  /**
   * FORG token contract. This is what the contract bar shows.
   *
   * There is no token yet, so leave it empty: the bar reads "Coming Soon" and
   * the copy button stays disabled until there is an address to show.
   */
  forgTokenAddress: "",

  /**
   * ForgCore: the asset registry, corporate action registry and lifecycle state.
   * Used by the `reads` entries below. It is never shown in the contract bar.
   */
  forgCoreAddress: "0x8FB36E0EBa99b6D415c5953C192DC75Fd822925e",

  /**
   * WalletConnect v2 project id, from cloud.reown.com.
   *
   * This is a public client identifier, not a secret - it ships in any dapp
   * frontend. Empty, and the Connect button falls back to an injected wallet
   * only; with no injected wallet either, the button does not render at all.
   */
  walletConnectProjectId: "ff24e7c4e7d10744e3ccd080e4307cad",

  /**
   * Force the WalletConnect QR flow even when a browser wallet is installed.
   * Default false: an injected wallet is the faster path when it is there.
   */
  preferWalletConnect: false,

  /* Optional outbound links. Empty values leave the link inert. */
  links: {
    /* Optional standalone dapp. Empty uses the integrated wallet experience. */
    dapp: "",
    docs: "",
    x: "",
  },

  /**
   * Live numbers pulled straight from the deployed contract.
   *
   * Each entry binds one view function to one element on the page:
   *
   *   slot      the value of a data-forg-read attribute in index.html
   *             ("events" and "assets" exist today)
   *   contract  "forgCore" (the only FORG contract)
   *   signature the solidity view function, exactly as declared
   *   returns   "uint256" | "bool" | "address" | "string"
   *   decimals  optional, divides a uint before it is shown
   *   template  optional, "{value}" is replaced with the formatted result
   *
   * Example, using view functions ForgCore actually exposes:
   *
   *   reads: [
   *     {
   *       slot: "events",
   *       contract: "forgCore",
   *       signature: "eventCount()",
   *       returns: "uint256",
   *       template: "{value} events",
   *     },
   *     {
   *       slot: "assets",
   *       contract: "forgCore",
   *       signature: "assetCount()",
   *       returns: "uint256",
   *       template: "{value} assets",
   *     },
   *   ],
   *
   * A read that fails, or whose contract is not set, leaves the static copy in
   * place. Nothing on the page depends on a successful call.
   */
  reads: [],
};

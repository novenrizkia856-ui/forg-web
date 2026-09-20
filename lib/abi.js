/**
 * The slice of ABI encoding this page needs: build calldata for a view
 * function and decode a single return value.
 *
 * Deliberately narrow. FORG only reads from the contract here, never writes.
 */
import { keccak256Hex } from "./keccak.js";

const strip = (hex) => (hex.startsWith("0x") ? hex.slice(2) : hex);

/** First four bytes of keccak256(signature), e.g. "transfer(address,uint256)". */
export function selector(signature) {
  return keccak256Hex(signature).slice(0, 10);
}

const padWord = (hex) => strip(hex).toLowerCase().padStart(64, "0");

function encodeArgument(type, value) {
  if (type === "address") {
    const address = strip(String(value));
    if (!/^[0-9a-fA-F]{40}$/.test(address)) throw new Error(`not an address: ${value}`);
    return padWord(address);
  }
  if (type.startsWith("uint") || type.startsWith("int")) {
    return padWord(BigInt(value).toString(16));
  }
  if (type === "bool") return padWord(value ? "1" : "0");
  if (type === "bytes32") return padWord(strip(String(value)));
  throw new Error(`unsupported argument type: ${type}`);
}

/** Argument types read straight out of the signature text. */
export function argumentTypes(signature) {
  const inner = signature.slice(signature.indexOf("(") + 1, signature.lastIndexOf(")")).trim();
  return inner === "" ? [] : inner.split(",").map((part) => part.trim());
}

/**
 * @param {string} signature e.g. "statusOf(address)"
 * @param {Array} args
 * @returns {string} 0x prefixed calldata
 */
export function encodeCall(signature, args = []) {
  const types = argumentTypes(signature);
  if (types.length !== args.length) {
    throw new Error(`${signature} takes ${types.length} arguments, got ${args.length}`);
  }
  const body = types.map((type, index) => encodeArgument(type, args[index])).join("");
  return selector(signature) + body;
}

/**
 * Decode a single return value.
 *
 * @param {string} type "uint256" | "bool" | "address" | "string"
 * @param {string} data 0x prefixed return data from eth_call
 */
export function decodeResult(type, data) {
  const hex = strip(data);
  if (hex.length < 64) throw new Error("return data too short");
  const head = hex.slice(0, 64);

  if (type.startsWith("uint") || type.startsWith("int")) return BigInt(`0x${head}`);
  if (type === "bool") return BigInt(`0x${head}`) !== 0n;
  if (type === "address") return `0x${head.slice(24)}`;
  if (type === "string" || type === "bytes") {
    const offset = Number(BigInt(`0x${head}`)) * 2;
    const length = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`));
    const body = hex.slice(offset + 64, offset + 64 + length * 2);
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) bytes[i] = parseInt(body.slice(i * 2, i * 2 + 2), 16);
    return type === "string" ? new TextDecoder().decode(bytes) : `0x${body}`;
  }
  throw new Error(`unsupported return type: ${type}`);
}

/** Shorten a uint by its token decimals, keeping the result readable. */
export function formatUnits(value, decimals = 0) {
  if (!decimals) return value.toString();
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

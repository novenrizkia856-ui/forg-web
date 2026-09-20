import test from "node:test";
import assert from "node:assert/strict";
import { keccak256Hex } from "../lib/keccak.js";
import { selector, encodeCall, decodeResult, formatUnits } from "../lib/abi.js";

test("keccak256 matches the published vectors", () => {
  assert.equal(keccak256Hex(""), "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  assert.equal(keccak256Hex("abc"), "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
});

test("keccak256 survives the 136 byte rate boundary", () => {
  /* the sponge absorbs 136 bytes at a time, so these three take different paths */
  const digests = [135, 136, 137].map((length) => keccak256Hex("a".repeat(length)));
  digests.forEach((digest) => assert.match(digest, /^0x[0-9a-f]{64}$/));
  assert.equal(new Set(digests).size, 3);
});

test("function selectors match the ethereum ABI", () => {
  assert.equal(selector("transfer(address,uint256)"), "0xa9059cbb");
  assert.equal(selector("balanceOf(address)"), "0x70a08231");
  assert.equal(selector("totalSupply()"), "0x18160ddd");
});

test("calldata puts the arguments in 32 byte words", () => {
  const data = encodeCall("balanceOf(address)", ["0x1234567890abcdef1234567890abcdef1234abcd"]);
  assert.equal(data, "0x70a08231" + "0".repeat(24) + "1234567890abcdef1234567890abcdef1234abcd");
});

test("calldata rejects the wrong number of arguments", () => {
  assert.throws(() => encodeCall("balanceOf(address)", []), /takes 1 arguments/);
});

test("return data decodes by type", () => {
  const word = (hex) => "0x" + hex.padStart(64, "0");
  assert.equal(decodeResult("uint256", word("2a")), 42n);
  assert.equal(decodeResult("bool", word("1")), true);
  assert.equal(decodeResult("bool", word("0")), false);
  assert.equal(
    decodeResult("address", word("1234567890abcdef1234567890abcdef1234abcd")),
    "0x1234567890abcdef1234567890abcdef1234abcd",
  );
});

test("dynamic strings decode from their offset", () => {
  const data =
    "0x" +
    "20".padStart(64, "0") +
    "5".padStart(64, "0") +
    Buffer.from("VALID").toString("hex").padEnd(64, "0");
  assert.equal(decodeResult("string", data), "VALID");
});

test("formatUnits keeps whole numbers plain", () => {
  assert.equal(formatUnits(1234n), "1234");
  assert.equal(formatUnits(1500000000000000000n, 18), "1.5");
  assert.equal(formatUnits(2000000000000000000n, 18), "2");
});

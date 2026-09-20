/**
 * Keccak 256, the hash ethereum uses for function selectors.
 *
 * Small and dependency free on purpose: the page only hashes a handful of
 * short function signatures, so clarity beats raw speed here.
 */

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

/* rotation offsets, indexed as ROTATIONS[x][y] */
const ROTATIONS = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

const MASK = (1n << 64n) - 1n;
const RATE = 136; /* 1600 bits of state minus 512 bits of capacity, in bytes */

const rotl = (value, shift) =>
  shift === 0 ? value : ((value << BigInt(shift)) | (value >> BigInt(64 - shift))) & MASK;

function permute(lanes) {
  for (let round = 0; round < 24; round += 1) {
    /* theta */
    const c = new Array(5);
    for (let x = 0; x < 5; x += 1) {
      c[x] = lanes[x] ^ lanes[x + 5] ^ lanes[x + 10] ^ lanes[x + 15] ^ lanes[x + 20];
    }
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 5; y += 1) lanes[x + 5 * y] ^= d;
    }

    /* rho and pi */
    const b = new Array(25).fill(0n);
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(lanes[x + 5 * y], ROTATIONS[x][y]);
      }
    }

    /* chi */
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        lanes[x + 5 * y] = b[x + 5 * y] ^ (~b[((x + 1) % 5) + 5 * y] & b[((x + 2) % 5) + 5 * y] & MASK);
      }
    }

    /* iota */
    lanes[0] ^= ROUND_CONSTANTS[round];
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Uint8Array} 32 byte digest
 */
export function keccak256(bytes) {
  const padded = new Uint8Array(Math.ceil((bytes.length + 1) / RATE) * RATE);
  padded.set(bytes);
  padded[bytes.length] = 0x01; /* keccak padding, not the 0x06 of sha3 */
  padded[padded.length - 1] |= 0x80;

  const lanes = new Array(25).fill(0n);

  for (let offset = 0; offset < padded.length; offset += RATE) {
    for (let lane = 0; lane < RATE / 8; lane += 1) {
      let value = 0n;
      for (let byte = 7; byte >= 0; byte -= 1) {
        value = (value << 8n) | BigInt(padded[offset + lane * 8 + byte]);
      }
      lanes[lane] ^= value;
    }
    permute(lanes);
  }

  const digest = new Uint8Array(32);
  for (let lane = 0; lane < 4; lane += 1) {
    let value = lanes[lane];
    for (let byte = 0; byte < 8; byte += 1) {
      digest[lane * 8 + byte] = Number(value & 0xffn);
      value >>= 8n;
    }
  }
  return digest;
}

export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** keccak256 of a utf8 string, as a 0x prefixed hex string. */
export function keccak256Hex(text) {
  return `0x${toHex(keccak256(new TextEncoder().encode(text)))}`;
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import jsQR from "jsqr";
import { PNG } from "pngjs";

const expected = "https://arithmomaniac.github.io/sefaria-web-components/";
const input = path.resolve(
  import.meta.dirname,
  "..",
  "public",
  "media",
  "showcase-qr.png",
);
const png = PNG.sync.read(await readFile(input));
const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (decoded?.data !== expected) {
  throw new Error(
    `QR destination mismatch: expected ${expected}, received ${decoded?.data ?? "no decoded value"}.`,
  );
}

process.stdout.write(`${decoded.data}\n`);

import { writeFile } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";

const destination = "https://arithmomaniac.github.io/sefaria-web-components/";
const media = path.resolve(import.meta.dirname, "..", "public", "media");
const svgOutput = path.join(media, "showcase-qr.svg");
const pngOutput = path.join(media, "showcase-qr.png");
const svg = await QRCode.toString(destination, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 4,
  width: 256,
  color: {
    dark: "#1b1a19",
    light: "#ffffff",
  },
});

const png = await QRCode.toBuffer(destination, {
  type: "png",
  errorCorrectionLevel: "M",
  margin: 4,
  width: 512,
  color: {
    dark: "#1b1a19",
    light: "#ffffff",
  },
});

await Promise.all([writeFile(svgOutput, svg), writeFile(pngOutput, png)]);

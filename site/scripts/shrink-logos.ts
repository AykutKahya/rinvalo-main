/**
 * Logos are shown at 20-64 px, so anything wider than 128 px (2x for sharp screens) is cut down
 * and recompressed. Safe to run on every bot run: a logo already small enough is left alone.
 *
 *   tsx scripts/shrink-logos.ts [folder ...]     default: public/crests public/leagues
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SIZE = 128;
const folders = process.argv.slice(2).length ? process.argv.slice(2) : ["public/crests", "public/leagues"];
let shrunk = 0;
let saved = 0;
for (const folder of folders) {
  if (!existsSync(folder)) continue;
  for (const name of readdirSync(folder).filter((f) => f.endsWith(".png"))) {
    const path = join(folder, name);
    const input = readFileSync(path);
    try {
      const { width = 0, height = 0 } = await sharp(input).metadata();
      if (Math.max(width, height) <= SIZE) continue;
      const out = await sharp(input)
        .resize(SIZE, SIZE, { fit: "inside" })
        .png({ palette: true, quality: 95, effort: 10, compressionLevel: 9 })
        .toBuffer();
      writeFileSync(path, out);
      shrunk++;
      saved += input.length - out.length;
    } catch (err) {
      console.warn(`${path}: ${(err as Error).message}`);
    }
  }
}
if (shrunk) console.log(`${shrunk} logo küçültüldü (${Math.round(saved / 1024)} KB kazanç)`);

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");
const outDir = resolve(import.meta.dirname, "..", "out");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

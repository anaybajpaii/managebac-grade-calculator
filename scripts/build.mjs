// Bundles src/ into dist/ and copies static files. Usage: node scripts/build.mjs [--watch]
import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("manifest.json", "dist/manifest.json");
await cp("icons", "dist/icons", { recursive: true });

const options = {
  entryPoints: { content: "src/content/index.ts" },
  outdir: "dist",
  bundle: true,
  format: "iife", // content scripts can't be ES modules
  target: "chrome110",
  sourcemap: false,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching...");
} else {
  await build(options);
}

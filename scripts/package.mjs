import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

execFileSync(process.execPath, ["scripts/build.mjs"], { stdio: "inherit" });

const { version } = JSON.parse(await readFile("manifest.json", "utf8"));
await mkdir("release", { recursive: true });
const out = resolve("release", `grade-calculator-for-managebac-${version}.zip`);
await rm(out, { force: true });

if (process.platform === "win32") {
  execFileSync("tar", ["-a", "-c", "-f", out, "-C", "dist", "."], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-qr", out, "."], { cwd: "dist", stdio: "inherit" });
}
console.log(`Wrote ${out}`);

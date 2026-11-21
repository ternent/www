import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(process.argv[2] ?? "dist");
const origin = "https://ternent.dev";
function localFile(url) {
  const parsed = new URL(url, `${origin}/`);
  assert.equal(parsed.origin, origin, `Unexpected external precache URL: ${url}`);
  const file = resolve(root, `.${decodeURIComponent(parsed.pathname)}`);
  assert.ok(file.startsWith(`${root}${sep}`), `Asset is outside the build: ${url}`);
  assert.ok(existsSync(file), `Build is missing required asset: ${url}`);
  return file;
}

const manifestPath = localFile("/manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.ok(manifest.name && manifest.start_url, "Manifest must name the app and its start URL");
for (const icon of manifest.icons) localFile(icon.src);

let precache;
const captured = new Error("Precache captured");
const define = (dependencies, factory) => {
  for (const dependency of dependencies) localFile(`${dependency}.js`);
  factory({
    clientsClaim() {},
    precacheAndRoute(entries) { precache = entries; throw captured; },
  });
};
try {
  runInNewContext(readFileSync(localFile("/sw.js"), "utf8"), {
    self: { define, skipWaiting() {} }, define,
  });
} catch (error) {
  if (error !== captured) throw error;
}
assert.ok(precache?.length, "Service worker must declare its precache");
for (const entry of precache) localFile(typeof entry === "string" ? entry : entry.url);
for (const file of readdirSync(root, { recursive: true }).filter((file) => file.endsWith(".html") && file !== "offline.html")) {
  const html = readFileSync(resolve(root, file), "utf8");
  const links = html.match(/<link\b[^>]*rel=["']manifest["'][^>]*>/g) ?? [];
  assert.equal(links.length, 1, `${file} must have one manifest link`);
}
console.log(`Verified manifest, icons and ${precache.length} precached assets.`);

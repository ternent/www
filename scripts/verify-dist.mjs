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
  assert.ok(!/__APP_(STORY|SUBDOMAIN)_PATHS__/.test(html), `${file} has unresolved navigation config`);
  const redirect = html.match(/<script\b[^>]*data-subdomain-redirect[^>]*>([\s\S]*?)<\/script>/);
  const position = html.match(/<script\b[^>]*data-initial-position[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(redirect && position, `${file} must include both initial navigation scripts`);
  assert.ok(redirect.index < html.indexOf("<body"), `${file} must redirect before rendering content`);
  assert.ok(position.index > html.indexOf("</main>"), `${file} must position after rendering page content`);
  for (const match of [redirect, position]) {
    assert.ok(!/\b(?:async|defer|type=)/.test(match[0].split(">")[0]), `${file} must position before deferred app scripts`);
  }
  let redirectedTo;
  runInNewContext(redirect[1], {
    URL,
    window: { location: { href: "https://concord.ternent.dev/", replace(url) { redirectedTo = url; } } },
  });
  assert.equal(redirectedTo, `${origin}/concord`, `${file} must redirect suite hosts without the app bundle`);
  const calls = [];
  runInNewContext(position[1], {
    window: {
      location: { pathname: "/concord" }, history: { state: { scroll: { left: 0, top: 640 } } },
      scrollTo(value) { calls.push(value); },
    },
    document: { documentElement: { style: { removeProperty(value) { calls.push(value); } } } },
  });
  assert.equal(calls[0]?.top, 640, `${file} must restore the saved position`);
  assert.equal(calls[0]?.behavior, "instant", `${file} must position without animating`);
  assert.equal(calls[1], "visibility", `${file} must reveal content after positioning`);
}
console.log(`Verified manifest, icons and ${precache.length} precached assets.`);

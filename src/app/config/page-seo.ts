const origin = "https://ternent.dev";
export const siteDescription =
  "Open-source tools for local-first, encrypted, verifiable software. Build applications on portable keys and signed history.";

export function pageSeo(path: string) {
  const examples = path === "/examples" || path.startsWith("/examples/");
  const demo = path.startsWith("/demo/");
  const inspector = path === "/inspect" || path.startsWith("/inspect/");
  const seal = path === "/examples/seal";
  const canonical = `${origin}${inspector ? "/inspect" : seal ? "/examples/seal" : examples ? "/examples" : demo ? path : "/"}`;
  const title = seal
    ? "Seal: verify a signed file | ternent.dev"
    : inspector
      ? "Document inspector | ternent.dev"
      : examples
        ? "Examples: rebuild from signed history | ternent.dev"
        : demo
          ? "Local identity demo | ternent.dev"
          : "Software built on signed history | ternent.dev";
  const description = seal
    ? "Verify a portable Seal proof locally, edit its file content and inspect the actual hash and signature results."
    : inspector
      ? "Inspect JSON and verify signed Ledger and Concord documents locally in your browser. Your file stays in your tab."
      : examples
        ? "Explore real encryption, signatures and replay in your browser. Verify an encrypted history and rebuild application state with Concord."
        : demo
          ? "Create, recover and unlock a local signing identity in your browser."
          : siteDescription;

  return {
    title,
    link: [{ rel: "canonical", href: canonical }],
    meta: [
      { name: "description", content: description },
      { name: "robots", content: demo ? "noindex, follow" : "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ternent.dev" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: `${origin}/social-preview.jpg` },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "ternent.dev. Software built on signed history." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: `${origin}/social-preview.jpg` },
      { name: "twitter:image:alt", content: "ternent.dev. Software built on signed history." },
    ],
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ternent.dev",
          url: `${origin}/`,
          description: siteDescription,
        }),
      },
    ],
  };
}

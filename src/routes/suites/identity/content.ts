import type { SuiteDefinition } from "../types";

const identitySuite = {
  slug: "identity",
  title: "Identity - Portable Ed25519 identities with derived encryption helpers.",
  themeName: "aurora",
  defaultThemeMode: "dark",
  seo: {
    shortName: "Identity",
    description:
      "@ternent/identity defines a portable Ed25519 identity model with mnemonic recovery, stable key IDs, X25519 derivation, and age-compatible key helpers.",
    themeColor: "#67e8f9",
    backgroundColor: "#0b1217",
    lang: "en",
    canonicalPath: "/identity",
  },
  landing: {
    navigationLinks: [
      {
        href: "#proof-model",
        label: "Identity Model",
      },
      {
        href: "#proof-json",
        label: "Serialized Form",
      },
      {
        href: "#surfaces",
        label: "Key Types",
      },
      {
        href: "#static-build",
        label: "How it works",
      },
      {
        href: "#developers",
        label: "Developers",
      },
    ],
    hero: {
      eyebrow: "identity",
      title: "Portable identities for signing, recovery, and derived encryption keys.",
      description:
        "@ternent/identity defines the capability root used across the Ternent stack. The identity itself is Ed25519 and seed-backed. From that same portable model, the package derives public keys, stable key IDs, X25519 keys, and age-compatible helpers when encryption surfaces need them.",
      supportingLine:
        "One portable identity root. Signing keys first. Encryption helpers derived explicitly.",
      note: "Identity is not a wallet, auth server, hosted keystore, or encryption protocol by itself.",
      primaryAction: {
        href: "https://www.npmjs.com/package/@ternent/identity",
        label: "Install package",
        variant: "primary",
      },
      secondaryAction: {
        href: "https://github.com/samternent/home/tree/main/packages/identity",
        label: "View package source",
        variant: "secondary",
      },
      preview: {
        title: "Identity surfaces",
        meta: "seed -> Ed25519 -> X25519 -> age",
        statusLabel: "Portable",
        statusTone: "neutral",
        rows: [
          {
            label: "Root material",
            value: "32-byte seed",
            valueTone: "primary",
          },
          {
            label: "Signing model",
            value: "Ed25519 identity",
            valueTone: "secondary",
          },
          {
            label: "Lookup handle",
            value: "derived keyId",
            valueTone: "accent",
          },
          {
            label: "Encryption helpers",
            value: "X25519 + age-compatible",
            valueTone: "success",
          },
        ],
        footerText:
          "The serialized identity stays the root. Other key surfaces are derived capabilities, not separate identity records.",
      },
    },
    proofModelSection: {
      eyebrow: "Identity Model",
      title: "One identity, several key surfaces",
      description:
        "@ternent/identity keeps the core model small. The portable object stores seed material plus derived public metadata. The package then exposes the key surfaces you need for signing, verification, recovery, and encryption interoperability.",
      items: [
        {
          title: "Seed-backed root",
          description:
            "The serialized identity stores seed material as the durable root capability. Mnemonics are a human recovery format for regenerating that same root.",
        },
        {
          title: "Ed25519 signing identity",
          description:
            "The main cryptographic identity is Ed25519. Use it for signing actions, proofs, and payloads where authenticity matters.",
        },
        {
          title: "Stable public references",
          description:
            "The package derives a public key and a keyId so the identity can be referenced, shared, and verified without exposing seed material.",
        },
        {
          title: "Derived encryption surfaces",
          description:
            "When encryption is needed, the same identity can derive X25519 keys and age-compatible recipient or secret key helpers without changing the root model.",
        },
      ],
    },
    proofJsonSection: {
      eyebrow: "Serialized Form",
      title: "A portable identity object",
      description:
        "The core artifact is plain JSON. It stores the signing identity root, public metadata, and enough information to move the identity between runtimes without redefining the contract.",
      code: '{\n  "format": "ternent-identity",\n  "version": "2",\n  "algorithm": "Ed25519",\n  "createdAt": "2026-03-13T00:00:00.000Z",\n  "publicKey": "BASE64URL-RAW-ED25519-PUBLIC-KEY",\n  "keyId": "identity_...",\n  "material": {\n    "kind": "seed",\n    "seed": "BASE64URL-RAW-32-BYTE-SEED"\n  }\n}',
      supportingText:
        "X25519 keys and age-compatible strings are derived from this identity when needed. They are helper surfaces, not a second identity format.",
    },
    surfacesSection: {
      eyebrow: "Key Types",
      title: "What keys are involved?",
      description:
        "@ternent/identity is primarily an Ed25519 identity package, but it derives a few adjacent key forms so the same identity can cross signing and encryption boundaries cleanly.",
      items: [
        {
          title: "Ed25519 identity",
          description:
            "The primary key type. This is the signing identity used for signatures, verification, and proof-oriented flows.",
          tone: "primary",
          icon: "shield",
        },
        {
          title: "Public key and keyId",
          description:
            "The public key is the verification surface. The keyId is a stable derived identifier for references, indexes, manifests, and user-facing handles.",
          tone: "secondary",
          icon: "check",
        },
        {
          title: "X25519 key pair",
          description:
            "Derived from the identity for encryption use cases that need an X25519 public or private key instead of Ed25519 signing material.",
          tone: "accent",
          icon: "stack",
        },
        {
          title: "Age-compatible helpers",
          description:
            "Recipient and secret key helpers expose the derived encryption capability in formats that fit age-compatible tooling and Armour.",
          tone: "info",
          icon: "globe",
        },
      ],
    },
    staticBuildSection: {
      eyebrow: "How it works",
      title: "Derive the right capability from one root",
      description:
        "Start from seed material or a 12/24-word mnemonic, derive the signing identity, and only then derive the adjacent key surfaces a flow actually needs.",
      steps: [
        {
          title: "Create or restore the root",
          description:
            "Generate a fresh identity from random seed material, or restore the same root from a mnemonic phrase.",
        },
        {
          title: "Derive the Ed25519 signing identity",
          description:
            "Use the root to derive the signing keypair and the public key that other systems can verify against.",
        },
        {
          title: "Compute a stable keyId",
          description:
            "Derive a stable identifier from the public key so references stay portable without inventing a separate registry.",
        },
        {
          title: "Derive encryption helpers when needed",
          description:
            "Only derive X25519 or age-compatible recipient and secret key helpers when the consuming surface actually needs encryption capability.",
        },
      ],
      closingLine:
        "The root identity remains Ed25519. Encryption-oriented keys are derived surfaces, not a change in identity type.",
      primaryAction: {
        href: "https://github.com/samternent/home/tree/main/packages/identity",
        label: "Read source",
        variant: "primary",
      },
    },
    developerSection: {
      eyebrow: "For Developers",
      title: "A small package with one identity contract",
      description:
        "The package keeps creation, recovery, signing, verification, and key derivation on top of one serialized contract. It does not mix in storage, auth sessions, or encryption envelopes.",
      surfaces: ["Create and restore", "Sign and verify", "Derive encryption helpers"],
      tabs: [
        {
          value: "contract",
          label: "Contract",
          title: "Serialized identity contract",
          meta: "SerializedIdentity",
          code: 'type SerializedIdentity = {\n  format: "ternent-identity";\n  version: "2";\n  algorithm: "Ed25519";\n  createdAt: string;\n  publicKey: string;\n  keyId: string;\n  material: {\n    kind: "seed";\n    seed: string;\n  };\n};',
          supportingCopy:
            "Portable JSON stores the seed-backed identity root plus public metadata. That is the contract other surfaces build on.",
          link: {
            href: "https://github.com/samternent/home/tree/main/packages/identity",
            label: "View package source",
          },
        },
        {
          value: "surfaces",
          label: "APIs",
          title: "Key surfaces exposed by the package",
          meta: "JavaScript",
          code: 'import {\n  createIdentity,\n  createMnemonicIdentity,\n  createIdentityFromMnemonic,\n  signUtf8,\n  verifyUtf8,\n  deriveX25519PublicKey,\n  deriveAgeRecipient,\n  deriveAgeSecretKey\n} from "@ternent/identity"',
          supportingCopy:
            "The surface area stays focused: identity creation and recovery, authenticity operations, and explicit derivation of adjacent encryption-oriented key forms.",
          link: {
            href: "https://www.npmjs.com/package/@ternent/identity",
            label: "Open package on npm",
          },
        },
      ],
    },
    suiteSection: {
      eyebrow: "The Suite",
      title: "Identity is the capability root across the stack.",
      description:
        "Other Ternent packages build on this identity model instead of redefining their own. That keeps signing, encryption, and replayable application history aligned around one portable root.",
      supportingText: "Identity defines the capability root. Other packages define what that capability is used for.",
      items: [
        {
          title: "Armour",
          description:
            "Derives age-compatible recipients and decryptors from the same identity model for explicit encryption flows.",
          themeColor: "#14b8a6",
          link: {
            href: "/armour",
            label: "Explore Armour",
          },
        },
        {
          title: "Seal",
          description:
            "Uses the signing identity for portable proofs and signed artifacts without changing the core identity contract.",
          themeColor: "#2f81f7",
          link: {
            href: "/seal",
            label: "Explore Seal",
          },
        },
        {
          title: "Concord",
          description:
            "Builds replayable application history on the same identity root for authored, signed, and optionally encrypted workflows.",
          themeColor: "#7ea7d6",
          link: {
            href: "/concord",
            label: "Explore Concord",
          },
        },
      ],
    },
    nonGoalsSection: {
      title: "What Identity does not do",
      items: [
        "It does not host, sync, or escrow keys for you.",
        "It does not define login sessions, user profiles, or account recovery services.",
        "It does not encrypt data by itself. Armour owns encryption flows.",
        "It does not define proof artifacts or replayable state. Seal and Concord own those layers.",
      ],
    },
    ctaSection: {
      eyebrow: "Ready",
      title: "Start from one portable identity model.",
      description:
        "Use @ternent/identity when you want seed-backed Ed25519 identities, mnemonic recovery, stable key IDs, and explicit derivation into encryption-friendly key surfaces.",
      primaryAction: {
        href: "https://www.npmjs.com/package/@ternent/identity",
        label: "Install package",
        variant: "primary",
      },
      secondaryAction: {
        href: "https://github.com/samternent/home/tree/main/packages/identity",
        label: "View source",
        variant: "secondary",
      },
    },
    footer: {
      brandLabel: "ternent.dev",
      brandHref: "https://ternent.dev",
      copyright: "© 2026.",
      links: [
        {
          href: "https://www.npmjs.com/package/@ternent/identity",
          label: "Package",
        },
        {
          href: "/armour",
          label: "Armour",
        },
        {
          href: "/seal",
          label: "Seal",
        },
        {
          href: "https://github.com/samternent/home/tree/main/packages/identity",
          label: "GitHub",
        },
      ],
    },
  },
} as const satisfies SuiteDefinition;

export default identitySuite;

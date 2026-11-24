import { createSealIdentity } from "@ternent/seal/crypto";
import { createSealHash, createSealProof } from "@ternent/seal/proof";

export const originalContent = "A file you can verify without asking its author.\n";

export async function createProofExample() {
  const identity = await createSealIdentity();
  return createSealProof({
    signer: { identity },
    subject: {
      kind: "file",
      path: "example.txt",
      hash: await createSealHash(new TextEncoder().encode(originalContent)),
    },
  });
}

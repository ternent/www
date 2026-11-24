import { expect, test } from "vite-plus/test";
import {
  createIdentityService,
  DEFAULT_ENCRYPTED_IDENTITY_STORAGE_KEY,
} from "../../modules/demo-identity/runtime/identity";
import { verifyTotpCode } from "../../modules/demo-identity/runtime/totp";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test("published Identity and Armour preserve encrypted local identity create, lock, reopen and mnemonic recovery", async () => {
  const storage = memoryStorage();
  const session = memoryStorage();
  const service = createIdentityService({ storage, sessionStorage: session });
  const draft = await service.createOnboardingDraft({ words: 12 });
  const password = "only-a-generated-test-identity";
  const created = await service.completeOnboarding({
    draft,
    password,
    confirmPassword: password,
    mnemonicConfirmed: true,
    mfaEnabled: false,
  });
  const saved = storage.getItem(DEFAULT_ENCRYPTED_IDENTITY_STORAGE_KEY)!;
  expect(JSON.parse(saved).encryption.algorithm).toBe("age");
  expect(saved).not.toContain(draft.mnemonic);
  expect(saved).not.toContain(draft.identity.material.seed);
  expect(session.getItem("solid/v2/concord/identity/unlocked/session/v1")).toBeNull();
  await service.lock();
  await expect(service.unlockWithPassword({ password: "incorrect-password" })).rejects.toThrow();
  const reopened = createIdentityService({ storage });
  expect((await reopened.unlockWithPassword({ password })).identityId).toBe(created.identityId);

  // Keep older envelope metadata readable; this does not manufacture a different cipher format.
  const legacy = JSON.parse(saved);
  legacy.encryption.algorithm = "rage";
  storage.setItem(DEFAULT_ENCRYPTED_IDENTITY_STORAGE_KEY, JSON.stringify(legacy));
  const legacyReader = createIdentityService({ storage });
  expect((await legacyReader.unlockWithPassword({ password })).identityId).toBe(created.identityId);

  const recovered = await createIdentityService({ storage: memoryStorage() }).recoverFromMnemonic({
    mnemonic: draft.mnemonic,
    password,
    confirmPassword: password,
    mfaEnabled: false,
  });
  expect(recovered.identityId).toBe(created.identityId);
}, 30_000);

test("authenticator HMAC matches the RFC 6238 SHA-1 reference truncated to six digits", async () => {
  const input = {
    secretBase32: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
    timeMs: 59_000,
    window: 0,
    policy: { issuer: "Reference", accountName: "test", digits: 6 as const, period: 30 as const },
  };
  expect(await verifyTotpCode({ ...input, code: "287082" })).toBe(true);
  expect(await verifyTotpCode({ ...input, code: "000000" })).toBe(false);
});

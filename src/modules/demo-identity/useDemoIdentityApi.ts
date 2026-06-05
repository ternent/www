import { readonly, ref, type Ref } from "vue";
import {
  createIdentityService,
  DEFAULT_DEV_SESSION_UNLOCK_STORAGE_KEY,
  type ActiveIdentity,
  type IdentityOnboardingDraft,
  type IdentityService,
  type StoredIdentitySummary,
} from "./runtime";

export type DemoIdentityStatus = "restoring" | "ready" | "error";

export type DemoIdentityApi = {
  status: Readonly<Ref<DemoIdentityStatus>>;
  activeIdentity: Readonly<Ref<ActiveIdentity | null>>;
  lastError: Readonly<Ref<string | null>>;
  identity: {
    activeIdentity: Readonly<Ref<ActiveIdentity | null>>;
    createOnboardingDraft(input?: {
      words?: 12 | 24;
      totpIssuer?: string;
      totpAccountName?: string;
    }): Promise<IdentityOnboardingDraft>;
    completeOnboarding(input: {
      draft: IdentityOnboardingDraft;
      password: string;
      confirmPassword: string;
      mnemonicConfirmed: boolean;
      mfaEnabled: boolean;
      totpCode?: string;
    }): Promise<ActiveIdentity>;
    recoverFromMnemonic(input: {
      mnemonic: string;
      password: string;
      confirmPassword: string;
      mfaEnabled: boolean;
      totpSecretBase32?: string;
      totpCode?: string;
      totpIssuer?: string;
      totpAccountName?: string;
      createdAt?: string;
    }): Promise<ActiveIdentity>;
    unlockWithPassword(input: { password: string; totpCode?: string }): Promise<ActiveIdentity>;
    getStoredIdentitySummary(): StoredIdentitySummary | null;
    lock(): Promise<void>;
  };
};

const status = ref<DemoIdentityStatus>("restoring");
const activeIdentity = ref<ActiveIdentity | null>(null);
const lastError = ref<string | null>(null);
let service: IdentityService | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getIdentityService(): IdentityService {
  if (!service) {
    service = createIdentityService({
      devSessionUnlockBypass: import.meta.env.DEV,
      rpName: "ternent.dev",
    });
  }

  return service;
}

async function setActive(task: () => Promise<ActiveIdentity>): Promise<ActiveIdentity> {
  try {
    const identity = await task();
    activeIdentity.value = identity;
    status.value = "ready";
    lastError.value = null;
    return identity;
  } catch (error) {
    status.value = "error";
    lastError.value = getErrorMessage(error);
    throw error;
  }
}

export function useDemoIdentityApi(): DemoIdentityApi {
  const identity = getIdentityService();

  return {
    status: readonly(status),
    activeIdentity: readonly(activeIdentity),
    lastError: readonly(lastError),
    identity: {
      activeIdentity: readonly(activeIdentity),
      createOnboardingDraft(input) {
        return identity.createOnboardingDraft(input);
      },
      completeOnboarding(input) {
        return setActive(() => identity.completeOnboarding(input));
      },
      recoverFromMnemonic(input) {
        return setActive(() => identity.recoverFromMnemonic(input));
      },
      unlockWithPassword(input) {
        return setActive(() => identity.unlockWithPassword(input));
      },
      getStoredIdentitySummary() {
        return identity.getStoredIdentitySummary();
      },
      async lock() {
        await identity.lock();
        activeIdentity.value = null;
        status.value = "restoring";
      },
    },
  };
}

export function resetDemoIdentityApiForTests(): void {
  service = null;
  status.value = "restoring";
  activeIdentity.value = null;
  lastError.value = null;
}

export const demoIdentityStorageKeys = {
  devSessionUnlock: DEFAULT_DEV_SESSION_UNLOCK_STORAGE_KEY,
};

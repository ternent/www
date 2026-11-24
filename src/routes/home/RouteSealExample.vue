<script setup lang="ts">
import "@/modules/inspector/workbench.css";
import { onMounted, ref, shallowRef, watch } from "vue";
import { verifySealProofAgainstBytes, type SealProofV2 } from "@ternent/seal/proof";
import ToolPage from "@/components/ToolPage.vue";
import { createProofExample, originalContent } from "@/modules/examples/seal-proof";

const content = ref(originalContent);
const proof = shallowRef<SealProofV2 | null>(null);
const result = shallowRef<Awaited<ReturnType<typeof verifySealProofAgainstBytes>> | null>(null);
const busy = ref(false);
const error = ref("");
let request = 0;
watch(content, () => {
  request++;
  result.value = null;
});
async function verify() {
  if (!proof.value) return;
  const current = ++request;
  const bytes = new TextEncoder().encode(content.value);
  busy.value = true;
  error.value = "";
  result.value = null;
  try {
    const checked = await verifySealProofAgainstBytes(proof.value, bytes);
    if (current === request) result.value = checked;
  } catch (cause) {
    if (current === request)
      error.value = cause instanceof Error ? cause.message : "Verification failed to run.";
  } finally {
    busy.value = false;
  }
}
async function start() {
  busy.value = true;
  error.value = "";
  try {
    proof.value = await createProofExample();
    await verify();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not create the proof.";
  } finally {
    busy.value = false;
  }
}
function restore() {
  content.value = originalContent;
  result.value = null;
}
onMounted(start);
</script>

<template>
  <ToolPage
    class="seal-example-page"
    title="Verify a signed file"
    description="Change the content and check it against the same portable Seal proof."
  >
    <div class="document-workbench seal-example">
      <section class="document-panel">
        <div class="panel-heading">
          <h2>example.txt</h2>
          <div class="seal-actions">
            <button class="button subtle" :disabled="busy || !proof" @click="restore">
              Restore original
            </button>
            <button class="button primary" :disabled="busy || !proof" @click="verify">
              Verify content
            </button>
          </div>
        </div>
        <p class="panel-description">
          This proof is signed once, locally. Editing the file does not sign it again.
        </p>
        <label for="seal-content" class="sr-only">File content to verify</label>
        <textarea
          id="seal-content"
          v-model="content"
          class="raw-editor"
          spellcheck="false"
          :disabled="busy"
        ></textarea>
        <p v-if="error" role="alert" class="panel-description">{{ error }}</p>
        <button v-if="error && !proof" class="button subtle" @click="start">Try again</button>
        <div class="seal-result" role="status">
          <h2>
            {{
              busy
                ? "Checking locally…"
                : result
                  ? result.valid
                    ? "Content verified"
                    : "Content does not match"
                  : "Verify the current content"
            }}
          </h2>
          <dl v-if="result" class="verification-list">
            <div>
              <dt>Content hash matches</dt>
              <dd>{{ result.hashMatch ? "yes" : "no" }}</dd>
            </div>
            <div>
              <dt>Proof signature valid</dt>
              <dd>{{ result.signatureValid ? "yes" : "no" }}</dd>
            </div>
            <div>
              <dt>Signer trusted</dt>
              <dd>Not established</dd>
            </div>
          </dl>
        </div>
        <details v-if="proof" class="seal-proof" open>
          <summary>Portable proof · public information</summary>
          <pre class="code-block" tabindex="0">{{ JSON.stringify(proof, null, 2) }}</pre>
        </details>
        <p class="small muted seal-note">
          Verification uses the public key in the proof. It establishes integrity, not the signer's
          identity or trustworthiness. This example uses @ternent/seal; Ledger document verification
          is separate. Nothing is uploaded or stored.
        </p>
      </section>
    </div>
  </ToolPage>
</template>

<style scoped>
.seal-example-page .seal-example {
  display: block;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
}
.seal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.seal-example-page .raw-editor {
  height: 160px;
  min-height: 160px;
}
.seal-result {
  padding-block: 24px;
}
.seal-proof summary {
  cursor: pointer;
  margin-bottom: 16px;
}
.seal-note {
  margin-top: 24px;
  line-height: 1.8;
}
@media (max-width: 700px) {
  .panel-heading {
    flex-wrap: wrap;
  }
}
</style>

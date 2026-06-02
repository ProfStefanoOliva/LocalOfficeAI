import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { LocalOfficeAIRuntime } from "../dist/local-runtime.js";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const logsDir = join(import.meta.dirname, "..", "tmp-runtime-logs");

mkdirSync(logsDir, { recursive: true });

const runtime = new LocalOfficeAIRuntime({
  repoRoot,
  logsDir
});

try {
  const initialStatus = await runtime.getStatus();
  console.log(`SELF_CHECK_OLLAMA=${initialStatus.ollama.detail}`);
  console.log(`SELF_CHECK_LOCAL_BRIDGE_BEFORE=${initialStatus.localBridge.detail}`);
  console.log(`SELF_CHECK_ADDIN_WORD_BEFORE=${initialStatus.addinWord.detail}`);

  await runtime.startComponents();
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 5000));

  const finalStatus = await runtime.getStatus();
  console.log(`SELF_CHECK_LOCAL_BRIDGE_AFTER=${finalStatus.localBridge.detail}`);
  console.log(`SELF_CHECK_ADDIN_WORD_AFTER=${finalStatus.addinWord.detail}`);

  if (!finalStatus.localBridge.active || !finalStatus.addinWord.active) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    `SELF_CHECK_ERROR=${error instanceof Error ? error.stack ?? error.message : String(error)}`
  );
  process.exitCode = 1;
} finally {
  await runtime.stopManagedComponents();
}

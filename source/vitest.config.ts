import {defineConfig,configDefaults} from 'vitest/config';

/**
 * A pure, offline unit/component invocation must never import a privileged
 * Auth/RTDB Emulator-only integration fixture. The parent suite is NOT
 * skipped: it is executed with real Firebase Auth tokens and both Functions
 * wrappers by scripts/pr142-integrated-emulator.mjs on the same candidate SHA.
 * Preserve every ordinary unit test and all assertions unchanged.
 */
export default defineConfig({
  test:{
    exclude:[...configDefaults.exclude,'parent-commit-service/test/integration.test.ts']
  }
});

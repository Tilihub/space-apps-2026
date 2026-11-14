// @ts-check
/**
 * The modules the app runs. Each is imported straight from its owner's folder, never copied
 * (contract section 3), and gets /api/<its name>/...
 *
 * Step 1 runs only the contract's example module, to prove the core on its own.
 * Next: health (angelos) replaces example, then meds (dadis2); env (potest) and mind when built.
 * alignment.test.js already checks that health and meds run inside this core.
 */
import example from '../../shared/contract/example/index.js';

/** @type {readonly import('../../shared/contract/contract.js').Module[]} */
export default Object.freeze([example]);

// @ts-check
/**
 * The functional demo registry. Health and meds are imported from their owners, as are
 * Potest's companion route/client and Petros's browser workout controller. Connection-owned
 * adapters fill the missing journal, mission-clock environment API and report transport.
 * See README.md for source revisions, permissions, pending handoffs and limitations.
 */
// Tommy's Pulsars plus the stage push-up reward (connection-owned, adapters/pulsars-demo.js).
import pulsars from './adapters/pulsars-demo.js';
import health from '../../people/angelos/health/index.js';
import meds from '../../people/dadis2/meds/index.js';
import mind from './adapters/mind.js';
import env from './adapters/environment.js';
import reports from './adapters/reports.js';

/** @type {readonly import('../../shared/contract/contract.js').Module[]} */
export default Object.freeze([health, meds, mind, env, reports, pulsars]);

/**
 * Pre-bootstrap DB helpers must never take down the API/worker (502/504 for all routes).
 * Log and continue so Admin/Shop can recover; fix DB and redeploy or run ensures manually.
 */
export declare function runStartupEnsures(): Promise<void>;
//# sourceMappingURL=run-startup-ensures.d.ts.map
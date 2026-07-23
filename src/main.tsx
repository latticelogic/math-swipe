import './index.css'
import { initErrorMonitor } from './utils/errorMonitor.ts'
import { initWebVitals } from './utils/webVitals.ts'
import { initI18n } from './i18n'

initErrorMonitor();
initWebVitals();

// Boot order matters: load the active locale's catalog FIRST (a no-op await
// for English — the majority), THEN evaluate the app modules (dynamic import
// of bootstrap.tsx), so module-level t() constants across the app see the
// right language (i18n design decision 1). The index.html boot splash covers
// this moment; a failed catalog load falls back to English inside initI18n
// rather than blocking boot.
initI18n()
    .catch(() => { /* English fallback — never block boot on i18n */ })
    .then(() => import('./bootstrap'))
    .catch(err => {
        // Bootstrap chunk failed to load (stale-deploy edge). The edge worker
        // already auto-recovers chunk-load crashes for assets; the last resort
        // here is surfacing the failure for the error monitor.
        console.error('[boot] failed to load app bundle:', err);
    });

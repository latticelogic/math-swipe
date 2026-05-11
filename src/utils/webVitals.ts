/**
 * Web Vitals reporter — measures real-user performance metrics
 * and logs them to a Firestore collection.
 *
 * Field set must match the `vitals/{vitalId}` Firestore rule (extra fields
 * cause silent rejection).
 */
import type { Metric } from 'web-vitals';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

function reportMetric(metric: Metric) {
    // Identifier-only id — does not include uid (no PII), still uniquely-keyed
    const id = `${metric.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setDoc(doc(db, 'vitals', id), {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
        navigationType: metric.navigationType,
        userAgent: navigator.userAgent.slice(0, 200),
        timestamp: serverTimestamp(),
    }).catch(() => {
        // Silently fail — monitoring shouldn't cause errors
    });
}

export function initWebVitals() {
    // Skip in dev: vitals from a dev server pollute prod data and cost reads
    if (import.meta.env.DEV) return;

    // Dynamic import to keep it off the critical path
    import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        onCLS(reportMetric);
        onINP(reportMetric);
        onLCP(reportMetric);
        onFCP(reportMetric);
        onTTFB(reportMetric);
    });
}

/**
 * Google-required attribution for reCAPTCHA v3 (used by Firebase App Check).
 * When you hide the floating reCAPTCHA badge (we do — see index.css), Google's
 * terms require this text to appear in the user flow instead.
 *
 * Renders NOTHING unless App Check is actually configured (VITE_APPCHECK_SITE_KEY
 * set), so it can't claim reCAPTCHA is in use when it isn't. Vite inlines the
 * env var at build time, so the deployed notice matches the deployed App Check
 * state exactly.
 */
export function RecaptchaNotice({ className }: { className?: string }) {
    if (!import.meta.env.VITE_APPCHECK_SITE_KEY) return null;
    return (
        <p className={className ?? 'text-[10px] ui text-[rgb(var(--color-fg))]/30 leading-relaxed'}>
            This site is protected by reCAPTCHA and the Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy&nbsp;Policy</a>
            {' '}and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms&nbsp;of&nbsp;Service</a>
            {' '}apply.
        </p>
    );
}

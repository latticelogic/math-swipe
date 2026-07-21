import { Component, Fragment, type ReactNode, type ErrorInfo } from 'react';
import { t } from '../i18n';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

/**
 * Per-tab boundary — contains a crash to the tab that threw it, so a
 * League render bug can't take down a kid's in-progress practice session.
 * Chunk-load failures escalate to a full reload (the retry can't help:
 * React.lazy caches a rejected import for the page's lifetime); anything
 * else remounts just this subtree via an epoch key.
 */
export class TabErrorBoundary extends Component<Props, State & { chunkError: boolean; epoch: number }> {
    state = { hasError: false, chunkError: false, epoch: 0 };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, chunkError: CHUNK_ERROR.test(error.message || '') };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Tab crashed:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <h2 className="text-base ui font-semibold text-[rgb(var(--color-fg))]/80">{t('error.title')}</h2>
                    <button
                        onClick={() => {
                            if (this.state.chunkError) { window.location.reload(); return; }
                            this.setState(s => ({ hasError: false, chunkError: false, epoch: s.epoch + 1 }));
                        }}
                        className="text-sm ui font-semibold text-[var(--color-gold)] bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 rounded-xl py-2 px-6"
                    >
                        {t('error.retry')}
                    </button>
                </div>
            );
        }
        return <Fragment key={this.state.epoch}>{this.props.children}</Fragment>;
    }
}

/** A failed lazy-chunk fetch (stale shell after a deploy, or a transient
 *  CDN miss) is recoverable: a reload picks up the current build. Match the
 *  messages Chrome/Firefox/Safari emit for dynamic-import failures. */
const CHUNK_ERROR = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;
const RELOAD_FLAG = 'math-swipe-chunk-reloaded-at';

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('App crashed:', error, info.componentStack);

        // Self-heal chunk-load failures with ONE automatic reload (throttled
        // to once a minute so a persistent failure still lands on the manual
        // "tap to reload" screen instead of a reload loop).
        if (CHUNK_ERROR.test(error.message || '')) {
            const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
            if (Date.now() - last > 60_000) {
                sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    onClick={() => window.location.reload()}
                    style={{
                        position: 'fixed', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#1a1a24', color: '#fff',
                        fontFamily: 'system-ui', cursor: 'pointer',
                        gap: '1rem', padding: '2rem', textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '3rem' }}>😵</div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('error.title')}</h2>
                    <p style={{ opacity: 0.5, fontSize: '0.875rem', margin: 0 }}>{t('error.body')}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

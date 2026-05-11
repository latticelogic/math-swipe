/**
 * ShareSheet — proper share modal for desktops (and mobile fallback).
 *
 * The native `navigator.share` flow on mobile is great, but on desktop it's
 * either missing or limited. Without this, sharing on desktop silently copies
 * a string to the clipboard with zero visual confirmation — which is where
 * most viral chains die because nothing actually gets pasted anywhere.
 *
 * The sheet:
 *  - Shows a thumbnail preview of the share card so the user sees what they're
 *    about to send.
 *  - Offers one-tap channels: Copy link, Copy text, Download PNG, X (Twitter),
 *    WhatsApp, Telegram, Reddit, Facebook.
 *  - On a phone with `navigator.share`, the inline "Native share" button is
 *    promoted to the primary action and opens the OS picker.
 */

import { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareSheetProps {
    open: boolean;
    onClose: () => void;
    /** Plain-text payload (caption + emoji rows + challenge URL). */
    text: string;
    /** Sharable challenge URL (no extra context). */
    url: string;
    /** PNG image of the share card, lazily generated. May be null while encoding. */
    imageBlob: Blob | null;
    /** Re-trigger image generation. The hosting Modal owns the cardRef. */
    onRegenerate?: () => void;
}

type Channel = 'copy-link' | 'copy-text' | 'download' | 'native' | 'twitter' | 'whatsapp' | 'telegram' | 'reddit' | 'facebook' | 'email';

interface ChannelDef {
    id: Channel;
    label: string;
    icon: string;
    /** Hide this channel based on environment (e.g. native is mobile-only). */
    available: () => boolean;
}

function buildChannels(): ChannelDef[] {
    // Discord intentionally omitted: it has no public `share?text=` deep link,
    // so the only realistic flow is "copy text and paste in a channel" — which
    // is exactly what `Copy text` already does. A fake Discord button that
    // secretly copies text would mislead users about where it sent.
    return [
        { id: 'native', label: 'Share…', icon: '📤', available: () => typeof navigator !== 'undefined' && typeof navigator.share === 'function' },
        { id: 'copy-link', label: 'Copy link', icon: '🔗', available: () => true },
        { id: 'copy-text', label: 'Copy text', icon: '📋', available: () => true },
        { id: 'download', label: 'Download', icon: '⬇️', available: () => true },
        { id: 'twitter', label: 'X', icon: '𝕏', available: () => true },
        { id: 'whatsapp', label: 'WhatsApp', icon: '💬', available: () => true },
        { id: 'telegram', label: 'Telegram', icon: '✈️', available: () => true },
        { id: 'reddit', label: 'Reddit', icon: '👽', available: () => true },
        { id: 'facebook', label: 'Facebook', icon: '👍', available: () => true },
        { id: 'email', label: 'Email', icon: '✉️', available: () => true },
    ];
}

function urlOpener(channel: Channel, text: string, url: string): string | null {
    const encText = encodeURIComponent(text);
    const encUrl = encodeURIComponent(url);
    switch (channel) {
        case 'twitter':   return `https://twitter.com/intent/tweet?text=${encText}`;
        case 'whatsapp':  return `https://wa.me/?text=${encText}`;
        case 'telegram':  return `https://t.me/share/url?url=${encUrl}&text=${encText}`;
        case 'reddit':    return `https://www.reddit.com/submit?url=${encUrl}&title=${encodeURIComponent('Beat my Math Swipe streak?')}`;
        case 'facebook':  return `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
        case 'email':     return `mailto:?subject=${encodeURIComponent('Beat my Math Swipe streak')}&body=${encText}`;
        default:          return null;
    }
}

export const ShareSheet = memo(function ShareSheet({ open, onClose, text, url, imageBlob, onRegenerate }: ShareSheetProps) {
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const channels = buildChannels().filter(c => c.available());
    const previewUrl = imageBlob ? URL.createObjectURL(imageBlob) : null;

    // Revoke object URL on change/unmount to avoid leaking blob memory.
    useEffect(() => {
        if (!previewUrl) return;
        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    // Trigger preview generation when the sheet opens
    useEffect(() => {
        if (open && !imageBlob && onRegenerate) onRegenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
    }, []);

    function flashToast(msg: string) {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 1800);
    }

    async function handleChannel(channel: Channel) {
        try {
            switch (channel) {
                case 'copy-link':
                    await navigator.clipboard.writeText(url);
                    flashToast('Link copied!');
                    return;
                case 'copy-text':
                    await navigator.clipboard.writeText(text);
                    flashToast('Text copied!');
                    return;
                case 'download':
                    if (!imageBlob) { flashToast('Generating image…'); return; }
                    {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(imageBlob);
                        a.download = 'math-swipe-share.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        // Revoke after a tick to let the browser start the download
                        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                        flashToast('Saved!');
                    }
                    return;
                case 'native': {
                    // Prefer file-share when supported (richer for IG/Stories/etc.)
                    const file = imageBlob ? new File([imageBlob], 'share.png', { type: 'image/png' }) : null;
                    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], text });
                    } else if (navigator.share) {
                        await navigator.share({ text, url });
                    }
                    return;
                }
                default: {
                    const target = urlOpener(channel, text, url);
                    if (target) window.open(target, '_blank', 'noopener,noreferrer');
                    return;
                }
            }
        } catch {
            // User cancelled or clipboard blocked — silent fail; the toast for
            // copy paths only fires on success above.
        }
    }

    // Portal to body so the sheet escapes its parent's stacking context.
    // Without this, mounting inside the SessionSummary's z-50 modal can trap
    // the fixed-position sheet below the summary's backdrop on some browsers.
    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[200] backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Share"
                        className="fixed inset-x-0 bottom-0 z-[201] bg-[var(--color-board)] border-t border-[var(--color-gold)]/20 rounded-t-3xl px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,16px)+24px)] max-w-md mx-auto md:max-w-lg md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    >
                        {/* Drag-handle (cosmetic) */}
                        <div className="md:hidden mx-auto mb-3 w-10 h-1 rounded-full bg-[rgb(var(--color-fg))]/15" />
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg chalk text-[var(--color-gold)]">Share your run</h3>
                            <button
                                onClick={onClose}
                                aria-label="Close share"
                                className="text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors text-xl leading-none px-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Preview thumbnail */}
                        <div className="flex gap-3 mb-4">
                            <div className="w-20 h-32 rounded-lg border border-[rgb(var(--color-fg))]/15 bg-[var(--color-surface)] overflow-hidden flex items-center justify-center text-[10px] ui text-[rgb(var(--color-fg))]/30">
                                {previewUrl
                                    ? <img src={previewUrl} alt="Share card preview" className="w-full h-full object-cover" />
                                    : <span>Generating…</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 leading-snug whitespace-pre-line max-h-24 overflow-hidden">
                                    {text.split('\n').slice(0, 4).join('\n')}
                                </div>
                                <div className="text-[10px] ui text-[var(--color-gold)]/70 mt-1 truncate">
                                    {url}
                                </div>
                            </div>
                        </div>

                        {/* Channel grid */}
                        <div className="grid grid-cols-5 gap-2">
                            {channels.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleChannel(c.id)}
                                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl border border-[rgb(var(--color-fg))]/10 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition-colors active:scale-95"
                                >
                                    <span className="text-xl leading-none" aria-hidden="true">{c.icon}</span>
                                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/60 leading-tight text-center">{c.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Inline confirmation toast (lives inside the sheet so it's
                            above the dimmed overlay and never blocked by other UI) */}
                        <AnimatePresence>
                            {toast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="mt-3 text-center text-xs ui text-[var(--color-correct)]"
                                >
                                    ✓ {toast}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
});

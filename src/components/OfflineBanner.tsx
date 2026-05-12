import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shows a subtle banner when the browser is offline.
 * Firebase offline persistence still works — this just informs the user.
 */
export const OfflineBanner = memo(function OfflineBanner() {
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const goOffline = () => setOffline(true);
        const goOnline = () => setOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    return (
        <AnimatePresence>
            {offline && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 py-1.5 bg-amber-600/90 text-white text-xs ui font-medium tracking-wide"
                >
                    {/* Hand-drawn antenna / signal-off glyph — replaces the 📡 emoji
                        per the no-emoji-in-UI rule. A crossed antenna reads more
                        immediately as "no signal" than a satellite-dish would. */}
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {/* Antenna stand */}
                        <line x1="12" y1="13" x2="12" y2="21" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        {/* Signal arcs */}
                        <path d="M7 9 C 7 5 17 5 17 9" />
                        <path d="M4 6 C 4 1 20 1 20 6" />
                        {/* Slash — the offline state */}
                        <line x1="4" y1="20" x2="20" y2="4" />
                    </svg>
                    <span>Offline — your progress is saved locally</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

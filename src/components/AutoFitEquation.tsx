import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
    /** Equation content (e.g. <MathExpr> or plain text) */
    children: ReactNode;
    /** Minimum scale to apply — won't shrink below this. Default 0.4. */
    minScale?: number;
    /** Extra className for the outer wrapper. */
    className?: string;
}

/**
 * Wraps a child element and auto-scales it down via CSS transform if its
 * natural width exceeds the parent's available width. Used for math
 * equations (KaTeX) that render at a fixed natural size and would otherwise
 * clip off narrow phone viewports.
 *
 * Why this is more complex than it looks: KaTeX loads asynchronously
 * (dynamic import inside MathExpr's useEffect), and web fonts (Fredericka /
 * Architects Daughter) also load async. The component's first measurement
 * fires before either is ready, so we layer three re-measure triggers:
 *   1. useLayoutEffect — fires synchronously after every render
 *   2. ResizeObserver on the outer — catches viewport rotation, layout shifts
 *   3. document.fonts.ready + a 100ms timeout — catches the post-KaTeX
 *      stabilization point reliably
 */
export function AutoFitEquation({ children, minScale = 0.4, className = '' }: Props) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    // Keep a ref so async callbacks (timeouts, ResizeObserver, fonts.ready)
    // always see the current scale, not the one captured at effect-setup time.
    const scaleRef = useRef(scale);
    scaleRef.current = scale;

    // Measurement function — pulled out so the multiple effects share it.
    // Computes against the unscaled natural width by dividing the observed
    // scrollWidth by the current scale (so we don't have to mutate the DOM
    // to "reset" the transform — which would fight React's controlled style).
    const measure = () => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;
        const currentScale = scaleRef.current;
        const observedWidth = inner.scrollWidth;
        const naturalWidth = observedWidth / Math.max(currentScale, 0.001);
        const availableWidth = outer.clientWidth;
        if (availableWidth === 0 || naturalWidth === 0) return;
        if (naturalWidth <= availableWidth) {
            if (currentScale !== 1) setScale(1);
            return;
        }
        const next = Math.max(minScale, availableWidth / naturalWidth);
        if (Math.abs(next - currentScale) > 0.005) setScale(next);
    };

    // Sync layout pass — covers the synchronous render case.
    useLayoutEffect(() => {
        measure();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [children]);

    // Async stabilization passes — covers KaTeX + font loading.
    useEffect(() => {
        let cancelled = false;
        const safeMeasure = () => { if (!cancelled) measure(); };

        // Wait for fonts to be ready, then measure once more.
        if ('fonts' in document) {
            document.fonts.ready.then(safeMeasure);
        }
        // Multiple timeouts to catch post-KaTeX stabilization at any point.
        // KaTeX renders via dynamic import + setHtml; it can finish anywhere
        // from ~10ms to several hundred ms depending on cache state.
        const timeouts = [50, 150, 400, 800].map(ms => setTimeout(safeMeasure, ms));

        // Re-measure on resize of EITHER the outer (viewport change) OR the
        // inner (KaTeX finished rendering and the content grew). Observing
        // both is critical — KaTeX injects HTML into the inner asynchronously,
        // so the inner's size change is our main "content settled" signal.
        const outer = outerRef.current;
        const inner = innerRef.current;
        let ro: ResizeObserver | null = null;
        if ('ResizeObserver' in window) {
            ro = new ResizeObserver(safeMeasure);
            if (outer) ro.observe(outer);
            if (inner) ro.observe(inner);
        }

        return () => {
            cancelled = true;
            timeouts.forEach(clearTimeout);
            ro?.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [children, minScale]);

    return (
        <div ref={outerRef} className={`w-full overflow-hidden flex items-center justify-center ${className}`}>
            <div
                ref={innerRef}
                style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                className="inline-block whitespace-nowrap"
            >
                {children}
            </div>
        </div>
    );
}

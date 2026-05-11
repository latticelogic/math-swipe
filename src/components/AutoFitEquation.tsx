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

    // Measurement function — pulled out so the multiple effects share it.
    const measure = () => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;
        // Reset transform first so we measure natural width
        inner.style.transform = '';
        const naturalWidth = inner.scrollWidth;
        const availableWidth = outer.clientWidth;
        if (availableWidth === 0) return;
        if (naturalWidth <= availableWidth) {
            setScale(1);
            return;
        }
        const next = Math.max(minScale, availableWidth / naturalWidth);
        setScale(next);
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
        // Belt-and-suspenders timeouts to catch post-KaTeX stabilization.
        const t1 = setTimeout(safeMeasure, 80);
        const t2 = setTimeout(safeMeasure, 300);

        // Re-measure on resize.
        const outer = outerRef.current;
        let ro: ResizeObserver | null = null;
        if (outer && 'ResizeObserver' in window) {
            ro = new ResizeObserver(safeMeasure);
            ro.observe(outer);
        }

        return () => {
            cancelled = true;
            clearTimeout(t1);
            clearTimeout(t2);
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

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
    /** Equation content (e.g. <MathExpr> or plain text) */
    children: ReactNode;
    /** Minimum scale to apply — won't shrink below this. Default 0.5. */
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
 * The component measures the inner width every time the layout changes,
 * computes the scale factor needed to fit, and applies it. The outer wrapper
 * holds the post-scale layout box so surrounding content stays correctly
 * positioned.
 */
export function AutoFitEquation({ children, minScale = 0.5, className = '' }: Props) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // useLayoutEffect so we measure before paint — avoids flash of un-scaled content.
    useLayoutEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const measure = () => {
            // Reset to 1 first so we measure the inner element's natural width.
            inner.style.transform = '';
            const naturalWidth = inner.scrollWidth;
            const availableWidth = outer.clientWidth;
            if (naturalWidth <= availableWidth || availableWidth === 0) {
                setScale(1);
                return;
            }
            const next = Math.max(minScale, availableWidth / naturalWidth);
            setScale(next);
        };

        measure();

        // Re-measure on resize.
        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        return () => ro.disconnect();
    }, [children, minScale]);

    // KaTeX renders asynchronously after import — re-measure on a short delay
    // so the scale picks up the real KaTeX width once it appears.
    useEffect(() => {
        const t1 = setTimeout(() => {
            const outer = outerRef.current;
            const inner = innerRef.current;
            if (!outer || !inner) return;
            inner.style.transform = '';
            const naturalWidth = inner.scrollWidth;
            const availableWidth = outer.clientWidth;
            if (naturalWidth <= availableWidth || availableWidth === 0) {
                setScale(1);
                return;
            }
            setScale(Math.max(minScale, availableWidth / naturalWidth));
        }, 60);
        return () => clearTimeout(t1);
    }, [children, minScale]);

    return (
        <div ref={outerRef} className={`w-full overflow-hidden flex items-center justify-center ${className}`}>
            <div
                ref={innerRef}
                style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                className="inline-block"
            >
                {children}
            </div>
        </div>
    );
}

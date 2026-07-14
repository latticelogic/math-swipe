/**
 * Placeholder shown while a lazy tab chunk loads. Now that first paint is
 * instant (Firebase + the tab chunks are deferred), a bare "Loading…" flash
 * reads as jank; a skeleton that echoes the tab's real layout reads as
 * intentional and makes the wait feel shorter.
 *
 * Pure CSS pulse (Tailwind `animate-pulse`) — no framer-motion, so the skeleton
 * itself adds nothing to the critical path it's covering for.
 */

type Variant = 'league' | 'me' | 'tricks' | 'generic';

function Bar({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-md bg-[rgb(var(--color-fg))]/10 ${className}`} />;
}

function LeagueSkeleton() {
    return (
        <div className="flex-1 px-5 pt-6 space-y-4">
            <Bar className="h-7 w-32 mx-auto" />
            <div className="space-y-2.5 pt-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--color-fg))]/8 px-3 py-3">
                        <Bar className="h-6 w-6 rounded-full" />
                        <Bar className="h-4 flex-1 max-w-[9rem]" />
                        <Bar className="h-4 w-12 ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MeSkeleton() {
    return (
        <div className="flex-1 px-5 pt-6 space-y-5">
            <Bar className="h-6 w-40" />
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Bar key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
            <Bar className="h-4 w-24" />
            <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Bar key={i} className="aspect-square rounded-xl" />
                ))}
            </div>
        </div>
    );
}

function TricksSkeleton() {
    return (
        <div className="flex-1 px-5 pt-6 space-y-4">
            <Bar className="h-7 w-36 mx-auto" />
            <div className="grid grid-cols-2 gap-3 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Bar key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

function GenericSkeleton() {
    return (
        <div className="flex-1 px-5 pt-8 space-y-4">
            <Bar className="h-7 w-40 mx-auto" />
            <Bar className="h-4 w-full max-w-sm mx-auto" />
            <Bar className="h-4 w-2/3 max-w-xs mx-auto" />
            <div className="pt-4 space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Bar key={i} className="h-12 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

export function TabSkeleton({ variant = 'generic' }: { variant?: Variant }) {
    switch (variant) {
        case 'league': return <LeagueSkeleton />;
        case 'me': return <MeSkeleton />;
        case 'tricks': return <TricksSkeleton />;
        default: return <GenericSkeleton />;
    }
}

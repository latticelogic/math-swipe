// Inline-replacement theme bootstrap — runs before app paint to prevent FOUC.
// Reads the theme preference from localStorage and applies it to <html>.
// Kept tiny and self-contained so it can be cached aggressively.
try {
    var t = localStorage.getItem('math-swipe-theme');
    if (t === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        var meta = document.getElementById('meta-theme-color');
        if (meta) meta.setAttribute('content', '#f5f0e8');
    }
} catch (e) { /* localStorage may be blocked — ignore */ }

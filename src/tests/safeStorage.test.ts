import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

describe('safeStorage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads and writes round-trip', () => {
        safeSetItem('k', 'v');
        expect(safeGetItem('k')).toBe('v');
    });

    it('returns null for missing keys', () => {
        expect(safeGetItem('missing')).toBeNull();
    });

    it('removeItem clears the value', () => {
        safeSetItem('k', 'v');
        safeRemoveItem('k');
        expect(safeGetItem('k')).toBeNull();
    });

    it('does not throw when localStorage.setItem throws (quota / private mode)', () => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = vi.fn(() => {
            throw new Error('QuotaExceededError');
        });
        try {
            expect(() => safeSetItem('k', 'v')).not.toThrow();
        } finally {
            Storage.prototype.setItem = original;
        }
    });

    it('does not throw when localStorage.getItem throws (Safari sandbox)', () => {
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = vi.fn(() => {
            throw new Error('SecurityError');
        });
        try {
            expect(() => safeGetItem('k')).not.toThrow();
            expect(safeGetItem('k')).toBeNull();
        } finally {
            Storage.prototype.getItem = original;
        }
    });

    it('does not throw when localStorage.removeItem throws', () => {
        const original = Storage.prototype.removeItem;
        Storage.prototype.removeItem = vi.fn(() => {
            throw new Error('SecurityError');
        });
        try {
            expect(() => safeRemoveItem('k')).not.toThrow();
        } finally {
            Storage.prototype.removeItem = original;
        }
    });
});

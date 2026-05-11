/**
 * Profile-slug utilities.
 *
 * The slug shape is `<displayName>-<uid.slice(0,4)>`. The 4-char uid suffix
 * lets us disambiguate two players who happened to pick the same display
 * name without forcing a global username uniqueness scheme.
 *
 * Lives outside ProfilePage.tsx because the share-card builder also needs
 * `buildProfileSlug` and Vite Fast Refresh requires component files to
 * export only components.
 */

export function buildProfileSlug(displayName: string, uid: string): string {
    const cleanName = displayName.replace(/\s+/g, '_');
    return `${encodeURIComponent(cleanName)}-${uid.slice(0, 4)}`;
}

/** Parse a slug like "EpicNinja75-abc1" into its parts.
 *  Returns null if the slug doesn't match the expected shape.
 *  Splits on the LAST hyphen so display names containing hyphens still work. */
export function parseProfileSlug(slug: string): { name: string; uidPrefix: string } | null {
    const i = slug.lastIndexOf('-');
    if (i < 1 || i >= slug.length - 1) return null;
    const name = decodeURIComponent(slug.slice(0, i));
    const uidPrefix = slug.slice(i + 1).toLowerCase();
    if (uidPrefix.length < 3 || uidPrefix.length > 8) return null;
    return { name, uidPrefix };
}

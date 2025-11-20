/**
 * Generates a URL-friendly slug from a name (first name + first surname only)
 * @param {string} name - The full name to convert to slug
 * @returns {string} - URL-friendly slug
 */
export function generateSlug(name) {
    if (!name) return '';

    // Split name into words and take only first two (name + surname)
    const words = name.trim().split(/\s+/);
    const firstName = words[0] || '';
    const firstSurname = words[1] || '';
    const shortName = `${firstName} ${firstSurname}`.trim();

    return shortName
        .toLowerCase()
        .normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validates if a string is a valid slug format
 * @param {string} slug - The slug to validate
 * @returns {boolean} - True if valid slug
 */
export function isValidSlug(slug) {
    if (!slug || typeof slug !== 'string') return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

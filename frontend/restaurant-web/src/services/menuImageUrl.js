// Pure helpers for menu image references. Kept free of axios / import.meta at module load so they can be unit tested.

const defaultApiBase = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RESERVATION_API_URL) ||
  'http://localhost:5000/api';

const hasHttpScheme = (value) => value.startsWith('http://') || value.startsWith('https://');

// Resolve an image reference for display.
//  * Absolute http(s) URLs (Azure Blob URLs, pasted external URLs) are returned UNCHANGED.
//  * Root-relative references (legacy local uploads such as /uploads/menu-images/x.jpg) are resolved against the API origin.
export const resolveImageUrl = (imageRef, apiBase = defaultApiBase()) => {
  if (!imageRef || typeof imageRef !== 'string') return '';
  const trimmed = imageRef.trim();
  if (hasHttpScheme(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${trimmed}`;
  }
  return trimmed;
};

// True for references produced by the old local-disk fallback (/uploads/... or uploads/...). Those files live on an
// ephemeral container disk and are not served in production: the photo must be uploaded again (or migrated separately).
export const isLegacyLocalUploadRef = (imageRef) => {
  if (!imageRef || typeof imageRef !== 'string') return false;
  const trimmed = imageRef.trim().toLowerCase();
  return !hasHttpScheme(trimmed) && (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/'));
};

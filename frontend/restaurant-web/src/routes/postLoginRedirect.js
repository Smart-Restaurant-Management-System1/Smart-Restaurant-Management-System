import { ROLES } from './roles.js';

// Pages whose APIs are Customer-only (see AppRoutes). Admin/KitchenStaff must never be sent back to them after login.
const CUSTOMER_ONLY_PATHS = [
  '/menu',
  '/orders',
  '/order-review',
  '/cart',
  '/reservation-pre-order',
  '/reservations',
];

const NEVER_REMEMBERED = ['/login', '/register', '/unauthorized'];

const matchesPath = (path, base) => path === base || path.startsWith(`${base}/`);

// Only same-origin relative paths are honoured: "/x" yes; "//evil.com", "/\\evil.com", "https://evil.com", "x" no.
const isSafeRelativePath = (path) =>
  typeof path === 'string' &&
  path.startsWith('/') &&
  !path.startsWith('//') &&
  !path.includes('\\') &&
  ![...path].some((ch) => ch.charCodeAt(0) < 32);

export const getDefaultPathForRoles = (roles = []) => {
  if (roles.includes(ROLES.ADMIN)) return '/admin';
  if (roles.includes(ROLES.KITCHEN_STAFF)) return '/kitchen';
  return '/portal';
};

// Where to go after login: the remembered destination only when this role may open it, otherwise the role's landing page.
export const resolvePostLoginPath = (roles, fromPath) => {
  const userRoles = Array.isArray(roles) ? roles : [];
  const fallback = getDefaultPathForRoles(userRoles);

  if (!isSafeRelativePath(fromPath)) return fallback;
  if (NEVER_REMEMBERED.some((p) => matchesPath(fromPath, p))) return fallback;

  if (userRoles.includes(ROLES.ADMIN)) {
    const blocked = fromPath.startsWith('/kitchen') || CUSTOMER_ONLY_PATHS.some((p) => matchesPath(fromPath, p));
    return blocked ? fallback : fromPath;
  }

  if (userRoles.includes(ROLES.KITCHEN_STAFF)) {
    return fromPath.startsWith('/kitchen') || fromPath.startsWith('/tables') ? fromPath : fallback;
  }

  // Customer: never admin, kitchen.
  return fromPath.startsWith('/admin') || fromPath.startsWith('/kitchen') ? fallback : fromPath;
};

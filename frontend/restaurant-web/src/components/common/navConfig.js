import { ROLES } from '../../routes/roles.js';

/**
 * Returns the declarative navigation links based on user roles and auth state.
 */
export function getNavLinks(user, isAuthenticated) {
  if (!isAuthenticated || !user) {
    return [
      { label: 'Sign In', to: '/login' },
      { label: 'Register', to: '/register' },
    ];
  }

  const roles = user.roles || [];
  const links = [];

  if (roles.includes(ROLES.CUSTOMER)) {
    links.push({ label: 'Dining Portal', to: '/portal' });
    links.push({ label: 'Reservations', to: '/reservations' });
  }

  if (roles.includes(ROLES.KITCHEN_STAFF)) {
    links.push({ label: 'Kitchen Queue', to: '/kitchen' });
  }

  if (roles.includes(ROLES.ADMIN)) {
    links.push({ label: 'Admin Dashboard', to: '/admin' });
    links.push({ label: 'Tables', to: '/admin/tables' });
  }

  return links;
}

/**
 * Returns the default dashboard destination based on user roles.
 */
export function getDefaultDashboardPath(user, isAuthenticated) {
  if (!isAuthenticated || !user) return '/login';
  const roles = user.roles || [];
  if (roles.includes(ROLES.ADMIN)) return '/admin';
  if (roles.includes(ROLES.KITCHEN_STAFF)) return '/kitchen';
  if (roles.includes(ROLES.CUSTOMER)) return '/portal';
  return '/portal';
}

/**
 * Returns styling and label for the user's role badge.
 */
export function getRoleBadgeInfo(roles = []) {
  if (roles.includes(ROLES.ADMIN)) {
    return {
      label: 'Admin',
      color: '#d4af37',
      bg: 'rgba(212, 175, 55, 0.15)',
      border: 'rgba(212, 175, 55, 0.45)',
    };
  }
  if (roles.includes(ROLES.KITCHEN_STAFF)) {
    return {
      label: 'Kitchen Staff',
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.15)',
      border: 'rgba(251, 191, 36, 0.45)',
    };
  }
  if (roles.includes(ROLES.CUSTOMER)) {
    return {
      label: 'Customer',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.45)',
    };
  }
  return {
    label: roles[0] || 'User',
    color: '#9ca3af',
    bg: 'rgba(156, 163, 175, 0.15)',
    border: 'rgba(156, 163, 175, 0.45)',
  };
}

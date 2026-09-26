export const ROLES = {
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
  KITCHEN_STAFF: 'KitchenStaff',
};

export const ALL_ROLES = [ROLES.ADMIN, ROLES.CUSTOMER, ROLES.KITCHEN_STAFF];

export const hasAnyRole = (user, requiredRoles = []) => {
  if (!user) return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;

  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : (user.role ? [user.role] : []);

  return requiredRoles.some((role) => userRoles.includes(role));
};

// The order cart, customer menu, order review/tracking and pre-order APIs (reservation-service) are Customer-only.
// Admin and KitchenStaff receive 403 from them, so they must never be routed into those pages.
export const CUSTOMER_ORDERING_ROLES = [ROLES.CUSTOMER];

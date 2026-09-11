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

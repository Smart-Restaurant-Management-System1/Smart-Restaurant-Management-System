import test from 'node:test';
import assert from 'node:assert/strict';

function canAdminModifyUser(targetUser, currentAdminUser) {
  if (!targetUser || !currentAdminUser) return false;
  const targetId = targetUser.userId || targetUser.id;
  const currentId = currentAdminUser.userId || currentAdminUser.id;
  if (targetId === currentId) return false;
  return true;
}

function getAvailableStatusActions(targetUser, currentAdminUser) {
  if (!canAdminModifyUser(targetUser, currentAdminUser)) {
    return { canBlock: false, canUnblock: false, canDelete: false };
  }

  const isBlocked = targetUser.status === 'Blocked';
  const isActive = targetUser.status === 'Active';
  const isDeleted = Boolean(targetUser.deletedAt) || targetUser.status === 'Inactive';

  return {
    canBlock: isActive && !isDeleted,
    canUnblock: isBlocked && !isDeleted,
    canDelete: !isDeleted,
  };
}

function buildAdminUserQueryParams({ search = '', role = 'All', status = 'All', page = 1, pageSize = 10 }) {
  const params = {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  };

  if (search && search.trim()) {
    params.search = search.trim();
  }

  if (role && role !== 'All') {
    params.role = role;
  }

  if (status && status !== 'All') {
    params.status = status;
  }

  return params;
}

function resolveUserStatusBadge(status) {
  switch (status) {
    case 'Active':
      return { label: 'Active', className: 'status-active', color: '#10b981' };
    case 'Blocked':
      return { label: 'Blocked', className: 'status-blocked', color: '#ef4444' };
    case 'Inactive':
      return { label: 'Inactive / Deleted', className: 'status-inactive', color: '#6b7280' };
    default:
      return { label: status || 'Unknown', className: 'status-unknown', color: '#9ca3af' };
  }
}

// Tests
test('Self-targeting protection: Admin cannot block or delete their own account', () => {
  const currentAdmin = { id: 1, email: 'admin@cinnamonbistro.com', role: 'Admin' };
  const targetAdmin = { id: 1, email: 'admin@cinnamonbistro.com', role: 'Admin', status: 'Active' };

  assert.equal(canAdminModifyUser(targetAdmin, currentAdmin), false);

  const actions = getAvailableStatusActions(targetAdmin, currentAdmin);
  assert.equal(actions.canBlock, false);
  assert.equal(actions.canUnblock, false);
  assert.equal(actions.canDelete, false);
});

test('Targeting other users: Admin can modify other customers and staff', () => {
  const currentAdmin = { id: 1, email: 'admin@cinnamonbistro.com', role: 'Admin' };
  const customer = { id: 42, email: 'guest@example.com', role: 'Customer', status: 'Active' };
  const staff = { id: 15, email: 'chef@cinnamonbistro.com', role: 'KitchenStaff', status: 'Blocked' };

  assert.equal(canAdminModifyUser(customer, currentAdmin), true);
  assert.equal(canAdminModifyUser(staff, currentAdmin), true);

  const customerActions = getAvailableStatusActions(customer, currentAdmin);
  assert.equal(customerActions.canBlock, true);
  assert.equal(customerActions.canUnblock, false);
  assert.equal(customerActions.canDelete, true);

  const staffActions = getAvailableStatusActions(staff, currentAdmin);
  assert.equal(staffActions.canBlock, false);
  assert.equal(staffActions.canUnblock, true);
  assert.equal(staffActions.canDelete, true);
});

test('Soft-deleted users: Cannot be blocked, unblocked, or re-deleted', () => {
  const currentAdmin = { id: 1, email: 'admin@cinnamonbistro.com', role: 'Admin' };
  const deletedUser = {
    id: 99,
    email: 'departed@example.com',
    role: 'Customer',
    status: 'Inactive',
    deletedAt: '2026-10-01T12:00:00Z',
  };

  const actions = getAvailableStatusActions(deletedUser, currentAdmin);
  assert.equal(actions.canBlock, false);
  assert.equal(actions.canUnblock, false);
  assert.equal(actions.canDelete, false);
});

test('Query parameter construction sanitizes search and omits default All filters', () => {
  const defaultParams = buildAdminUserQueryParams({});
  assert.deepEqual(defaultParams, { page: 1, pageSize: 10 });

  const filteredParams = buildAdminUserQueryParams({
    search: '  John Doe  ',
    role: 'Customer',
    status: 'Blocked',
    page: 2,
    pageSize: 20,
  });

  assert.deepEqual(filteredParams, {
    page: 2,
    pageSize: 20,
    search: 'John Doe',
    role: 'Customer',
    status: 'Blocked',
  });
});

test('Query parameter clamps invalid page numbers and empty search', () => {
  const clampedParams = buildAdminUserQueryParams({
    search: '    ',
    page: -5,
    pageSize: 500,
  });

  assert.equal(clampedParams.page, 1);
  assert.equal(clampedParams.pageSize, 100);
  assert.equal('search' in clampedParams, false);
});

test('Status badge resolution provides accurate semantic labels and styling', () => {
  const activeBadge = resolveUserStatusBadge('Active');
  assert.equal(activeBadge.label, 'Active');
  assert.equal(activeBadge.className, 'status-active');

  const blockedBadge = resolveUserStatusBadge('Blocked');
  assert.equal(blockedBadge.label, 'Blocked');
  assert.equal(blockedBadge.className, 'status-blocked');

  const inactiveBadge = resolveUserStatusBadge('Inactive');
  assert.equal(inactiveBadge.label, 'Inactive / Deleted');
  assert.equal(inactiveBadge.className, 'status-inactive');
});


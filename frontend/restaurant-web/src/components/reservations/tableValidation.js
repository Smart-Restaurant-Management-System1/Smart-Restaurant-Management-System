/**
 * Validates restaurant table creation form fields
 */
export function validateTableForm(formData) {
  const errors = {};

  const tableNumber = (formData.tableNumber || '').trim();
  if (!tableNumber) {
    errors.tableNumber = 'Table number is required';
  } else if (tableNumber.length > 20) {
    errors.tableNumber = 'Table number cannot exceed 20 characters';
  }

  const capacity = Number(formData.capacity);
  if (formData.capacity === '' || formData.capacity === null || formData.capacity === undefined || isNaN(capacity)) {
    errors.capacity = 'Capacity is required';
  } else if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be at least 1 person';
  } else if (capacity > 100) {
    errors.capacity = 'Capacity cannot exceed 100 persons';
  }

  const location = (formData.location || '').trim();
  if (!location) {
    errors.location = 'Location / Section is required';
  } else if (location.length > 100) {
    errors.location = 'Location cannot exceed 100 characters';
  }

  const status = (formData.status || 'Available').trim();
  const validStatuses = ['Available', 'Occupied', 'Inactive'];
  const matched = validStatuses.find((s) => s.toLowerCase() === status.toLowerCase());
  if (!matched) {
    errors.status = "Status must be 'Available', 'Occupied', or 'Inactive'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitizes input into strict payload for POST /api/tables
 */
export function sanitizeTablePayload(formData) {
  const statusTrimmed = (formData.status || 'Available').trim().toLowerCase();
  let normalizedStatus = 'Available';
  if (statusTrimmed === 'occupied') {
    normalizedStatus = 'Occupied';
  } else if (statusTrimmed === 'inactive') {
    normalizedStatus = 'Inactive';
  }

  return {
    tableNumber: (formData.tableNumber || '').trim().toUpperCase(),
    capacity: parseInt(formData.capacity, 10),
    location: (formData.location || '').trim(),
    status: normalizedStatus,
  };
}

/**
 * Validates customer profile form fields according to project validation rules.
 */
export function validateProfileForm(formData) {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

  const fullName = (formData.fullName || '').trim();
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length > 100) {
    errors.fullName = 'Full name cannot exceed 100 characters';
  }

  const email = (formData.email || '').trim();
  if (!email) {
    errors.email = 'Email address is required';
  } else if (!emailRegex.test(email)) {
    errors.email = 'Please enter a valid email address';
  } else if (email.length > 150) {
    errors.email = 'Email cannot exceed 150 characters';
  }

  const phone = (formData.phoneNumber || '').trim();
  if (phone) {
    if (!phoneRegex.test(phone)) {
      errors.phoneNumber = 'Please enter a valid phone number format';
    } else if (phone.length > 20) {
      errors.phoneNumber = 'Phone number cannot exceed 20 characters';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitizes input and produces strict update payload, stripping all protected fields.
 */
export function sanitizeProfilePayload(formData) {
  return {
    fullName: (formData.fullName || '').trim(),
    email: (formData.email || '').trim().toLowerCase(),
    phoneNumber: formData.phoneNumber ? formData.phoneNumber.trim() : null,
  };
}

/**
 * Maps incoming backend profile DTO safely to local form state.
 */
export function formatProfileForForm(apiProfile) {
  if (!apiProfile) {
    return {
      fullName: '',
      email: '',
      phoneNumber: '',
    };
  }

  return {
    fullName: apiProfile.fullName || '',
    email: apiProfile.email || '',
    phoneNumber: apiProfile.phoneNumber || '',
  };
}

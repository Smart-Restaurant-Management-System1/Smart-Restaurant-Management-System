// Known disposable, temporary, and throwaway email domains blocked during customer registration (SR-296)
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'tempmail.net', 'tempmail.org', 'temp-mail.org', 'temp-mail.io',
  'mailinator.com', 'mailinator.net', 'mailinator.org',
  '10minutemail.com', '10minutemail.net', '10minmail.com',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'sharklasers.com', 'grr.la', 'throwawaymail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'trashmail.com', 'trashmail.net', 'trashmail.me',
  'dispostable.com', 'fakeinbox.com', 'getairmail.com',
  'mohmal.com', 'crazymailing.com', 'maildrop.cc', 'inboxkitten.com',
  'nada.ltd', 'getnada.com', 'burnermail.io', 'mytemp.email',
  'tempr.email', 'discard.email', 'tempail.com', 'fakemailgenerator.com'
]);

/**
 * Checks whether an email address belongs to a known temporary or disposable provider.
 * Supports exact domain matches and subdomains.
 */
export const isDisposableEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return false;
  const domain = email.trim().toLowerCase().split('@').pop();
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  const parts = domain.split('.');
  if (parts.length > 2) {
    const rootDomain = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (DISPOSABLE_EMAIL_DOMAINS.has(rootDomain)) return true;
  }
  return false;
};

/**
 * Validates registration email syntax and deliverability standards.
 * Returns error string or null if valid.
 */
export const validateRegisterEmail = (email) => {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim();
  if (!emailRegex.test(cleanEmail)) {
    return 'Please enter a valid email address';
  }
  if (isDisposableEmail(cleanEmail)) {
    return 'Temporary or disposable email addresses are prohibited. Please use a permanent email.';
  }
  return null;
};


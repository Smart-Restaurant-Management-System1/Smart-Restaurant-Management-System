import { ROLES } from '../../routes/roles.js';

// Replace the account fallback with the real booking route when Sprint 2 supplies it.
export function getLandingActions({ isAuthenticated, user }) {
  if (!isAuthenticated) return { primary: { to: '/register', label: 'Get Started' }, secondary: { to: '/login', label: 'Login' }, booking: { to: '/register', label: 'Book a Table' } };
  const to = user?.roles?.includes(ROLES.ADMIN) ? '/admin'
    : user?.roles?.includes(ROLES.KITCHEN_STAFF) ? '/kitchen' : '/portal';
  return { primary: { to, label: 'My workspace' }, secondary: null, booking: { to, label: 'Go to my workspace' } };
}

export function focusLandingAnchor(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest('a[href^="#"]');
  const target = anchor && document.getElementById(anchor.getAttribute('href').slice(1));
  if (!target) return;
  event.preventDefault();
  window.history.pushState(null, '', anchor.getAttribute('href'));
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

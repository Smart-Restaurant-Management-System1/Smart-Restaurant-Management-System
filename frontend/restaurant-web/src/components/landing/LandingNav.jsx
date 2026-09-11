import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export const landingLinks = [
  ['Home', '#home'], ['About', '#about'], ['Features', '#features'],
  ['Reservations', '#reservations'], ['Contact', '#contact'],
];

export default function LandingNav({ actions, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef(null);

  const closeOnEscape = (event) => {
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
      toggleRef.current?.focus();
    }
  };

  return (
    <header className="bistro-header" onKeyDown={closeOnEscape} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }}>
      <a className="bistro-brand" href="#home" aria-label="Cinnamon Bistro home" onClick={() => setIsOpen(false)}>
        <img src="/landing-logo.webp" alt="Cinnamon Bistro" width="155" height="68" />
      </a>
      <button className="bistro-menu-toggle" type="button" ref={toggleRef}
        aria-expanded={isOpen} aria-controls="bistro-navigation" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{isOpen ? '×' : '☰'}</span>
      </button>
      <nav id="bistro-navigation" className={`bistro-navigation${isOpen ? ' is-open' : ''}`} aria-label="Main navigation">
        <div className="bistro-nav-links">
          {landingLinks.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setIsOpen(false)}>{label}</a>
          ))}
        </div>
        <div className="bistro-nav-actions" aria-busy={isLoading}>
          {isLoading ? <span role="status">Restoring session…</span> : <>
            {actions.secondary && (
              <Link className="bistro-login-button" to={actions.secondary.to} onClick={() => setIsOpen(false)}>
                {actions.secondary.label}
              </Link>
            )}
            <Link className="bistro-button bistro-button-dark" to={actions.primary.to}>{actions.primary.label} <span aria-hidden="true">↗</span></Link>
          </>}
        </div>
      </nav>
    </header>
  );
}

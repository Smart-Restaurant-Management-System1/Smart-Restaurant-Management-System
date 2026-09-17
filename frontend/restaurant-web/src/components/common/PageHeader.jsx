import React from 'react';

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  const formattedEyebrow = eyebrow ? (eyebrow.startsWith('✦') ? eyebrow : `✦ ${eyebrow}`) : null;

  return (
    <header className="page-header">
      <div className="page-header-info">
        {formattedEyebrow && <span className="page-header-eyebrow">{formattedEyebrow}</span>}
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}

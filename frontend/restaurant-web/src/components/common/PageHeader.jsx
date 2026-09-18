import React from 'react';

function PageHeader({ title, subtitle, eyebrow, actions, children }) {
  const actionContent = actions || children;

  return (
    <div className="page-header">
      <div className="page-header-info page-header-content">
        {eyebrow && <span className="page-header-eyebrow">{eyebrow}</span>}
        <h1 className="page-header-title">{title}</h1>

        {subtitle && (
          <p className="page-header-subtitle">{subtitle}</p>
        )}
      </div>

      {actionContent && (
        <div className="page-header-actions">
          {actionContent}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
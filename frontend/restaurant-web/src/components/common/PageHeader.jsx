import React from 'react';

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <h1 className="page-header-title">{title}</h1>

        {subtitle && (
          <p className="page-header-subtitle">{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="page-header-actions">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
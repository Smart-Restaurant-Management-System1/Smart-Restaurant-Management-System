import { reservationApi } from './tableService.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Friendly mapping for detail JSON keys into human-readable labels.
 */
export const KEY_LABEL_MAP = {
  targetUserId: 'Target User ID',
  email: 'User Email',
  role: 'User Role',
  newStatus: 'New Status',
  previousStatus: 'Previous Status',
  reason: 'Reason / Notes',
  isAvailable: 'Dish Availability',
  menuItemId: 'Dish ID',
  name: 'Dish / Item Name',
  price: 'Price (LKR)',
  category: 'Item Category',
  reservationId: 'Reservation ID',
  customerName: 'Customer Name',
  tableNumber: 'Table Number',
  capacity: 'Seating Capacity',
  location: 'Dining Location',
  updatedBy: 'Initiated By'
};

/**
 * Formats camelCase or mapped detail keys into title case labels.
 * @param {string} key
 * @returns {string}
 */
export const formatDetailKey = (key) => {
  if (KEY_LABEL_MAP[key]) return KEY_LABEL_MAP[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Formats operational details into a clean, human-readable summary string (SR-223 / SR-253).
 * @param {object} log
 * @returns {string}
 */
export const formatOperationalSummary = (log) => {
  if (!log || !log.detailsJson) return 'No additional details recorded.';
  try {
    const parsed = typeof log.detailsJson === 'string' ? JSON.parse(log.detailsJson) : log.detailsJson;
    if (!parsed || typeof parsed !== 'object') return String(log.detailsJson);
    const parts = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (value === null || value === undefined) continue;
      const label = formatDetailKey(key);
      let valStr = String(value);
      if (typeof value === 'boolean') {
        valStr = value ? 'Active' : 'Inactive';
      }
      parts.push(`${label}: ${valStr}`);
    }
    return parts.length > 0 ? parts.join('; ') : 'No additional details recorded.';
  } catch {
    return String(log.detailsJson);
  }
};

/**
 * Validates an audit log date range filter (SR-223 / SR-253).
 * Ensures 'from' is not after 'to', and range is within 90 days.
 * @param {string} from - 'YYYY-MM-DD'
 * @param {string} to - 'YYYY-MM-DD'
 * @returns {string|null} Error string if invalid, or null.
 */
export const validateAuditDateRange = (from, to) => {
  if (!from || !to) return null;
  if (from > to) {
    return "The 'from' date cannot be after the 'to' date.";
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    return 'Date range cannot exceed 90 days.';
  }
  return null;
};

/**
 * Generates quick date preset strings in YYYY-MM-DD format.
 * @param {'today'|'last7'|'last30'} preset
 * @returns {{ from: string, to: string }}
 */
export const getAuditDatePreset = (preset = 'last7') => {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case 'today':
      break;
    case 'last30':
      from.setDate(to.getDate() - 29);
      break;
    case 'last7':
    default:
      from.setDate(to.getDate() - 6);
      break;
  }

  const format = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    from: format(from),
    to: format(to),
  };
};

/**
 * Fetches paginated administrative audit logs from the backend (SR-223 / SR-253).
 * @param {object} params - { fromDate, toDate, actionType, adminId, search, page, pageSize }
 * @returns {Promise<{ items: Array, totalCount: number, page: number, pageSize: number, totalPages: number }>}
 */
export const getAuditLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.fromDate) queryParams.append('fromDate', params.fromDate);
  if (params.toDate) queryParams.append('toDate', params.toDate);
  if (params.actionType) queryParams.append('actionType', params.actionType);
  if (params.adminId) queryParams.append('adminId', params.adminId);
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', params.page);
  if (params.pageSize) queryParams.append('pageSize', params.pageSize);

  const response = await reservationApi.get(`/admin/audit-logs?${queryParams.toString()}`);
  return response.data;
};

/**
 * Retrieves the distinct list of recorded action types for filter dropdowns.
 * @returns {Promise<string[]>}
 */
export const getAuditActionTypes = async () => {
  const response = await reservationApi.get('/admin/audit-logs/actions');
  return response.data || [];
};

/**
 * Formats a friendly label and color badge for an audit action type.
 * @param {string} actionType
 * @returns {{ label: string, color: string, bg: string, border: string }}
 */
export const formatActionType = (actionType) => {
  switch (actionType) {
    case 'USER_BLOCKED':
      return { label: 'User Blocked', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'USER_UNBLOCKED':
      return { label: 'User Unblocked', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' };
    case 'USER_DELETED':
      return { label: 'User Deactivated', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'USER_STATUS_CHANGE_DENIED':
    case 'USER_DELETE_DENIED':
      return { label: 'Action Denied', color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    case 'MENU_ITEM_CREATED':
      return { label: 'Dish Created', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    case 'MENU_ITEM_UPDATED':
      return { label: 'Dish Updated', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
    case 'MENU_AVAILABILITY_CHANGED':
      return { label: 'Availability Changed', color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff' };
    case 'MENU_ITEM_DELETED':
      return { label: 'Dish Removed', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    case 'RESERVATION_STATUS_CHANGED':
      return { label: 'Booking Status', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
    case 'RESERVATION_RESCHEDULED':
      return { label: 'Booking Rescheduled', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' };
    case 'TABLE_CREATED':
      return { label: 'Table Added', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    case 'TABLE_UPDATED':
      return { label: 'Table Updated', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
    case 'TABLE_DELETED':
      return { label: 'Table Deactivated', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    default:
      return { label: actionType || 'Unknown Action', color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
  }
};

/**
 * Generates an Excel-compatible CSV string from audit logs with executive metadata and formula injection protection (SR-223 / SR-253).
 * @param {Array} logs - Array of audit log objects
 * @param {object} [filters] - { dateRange: { from, to }, actionType, searchKeyword }
 * @param {string} [adminEmail] - Generating administrator's email or identity
 * @returns {string} Safe CSV string with UTF-8 BOM
 */
export const generateAuditLogsCsv = (logs = [], filters = {}, adminEmail = '') => {
  if (!logs || logs.length === 0) return '';

  const sanitizeCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    // Formula injection mitigation (prepend ' if starts with =, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const dateRange = filters?.dateRange || (filters?.from ? filters : {});
  const fromDate = dateRange.from || 'Start';
  const toDate = dateRange.to || 'Present';
  const actionLabel = filters?.actionType ? formatActionType(filters.actionType).label : 'All Actions';
  const searchLabel = filters?.searchKeyword ? filters.searchKeyword : 'None';
  const auditor = adminEmail || 'System Administrator';
  const genUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // 1. Executive Metadata / Header block (matching PDF overview)
  const metaRows = [
    [sanitizeCell('CINNAMON BISTRO - ADMINISTRATIVE AUDIT TRAIL REPORT')],
    [
      sanitizeCell('Generated Date (UTC):'),
      sanitizeCell(genUtc),
      sanitizeCell('Generated By:'),
      sanitizeCell(auditor)
    ],
    [
      sanitizeCell('Date Window:'),
      sanitizeCell(`${fromDate} to ${toDate}`),
      sanitizeCell('Action Filter:'),
      sanitizeCell(actionLabel),
      sanitizeCell('Search Query:'),
      sanitizeCell(searchLabel)
    ],
    [
      sanitizeCell('Total Events:'),
      sanitizeCell(`${logs.length} Records`),
      sanitizeCell('Ledger Integrity:'),
      sanitizeCell('Immutable Append-Only Audit Log')
    ],
    [''] // Blank spacer row before table
  ];

  // 2. Data Table Column Headers
  const headers = [
    'Audit Log ID',
    'Timestamp (UTC)',
    'Action Type',
    'Action Code',
    'Administrator Email',
    'Admin ID',
    'Admin Role',
    'Target Resource',
    'Target ID',
    'Result',
    'Originating Service',
    'IP Address',
    'Operational Change Details'
  ];

  // 3. Data Table Rows
  const rows = logs.map((log) => [
    sanitizeCell(log.auditLogId),
    sanitizeCell(log.timestampUtc),
    sanitizeCell(formatActionType(log.actionType).label),
    sanitizeCell(log.actionType),
    sanitizeCell(log.adminEmail),
    sanitizeCell(log.adminId),
    sanitizeCell(log.adminRole),
    sanitizeCell(log.targetType),
    sanitizeCell(log.targetId || 'N/A'),
    sanitizeCell(log.result),
    sanitizeCell(log.sourceService),
    sanitizeCell(log.ipAddress || 'N/A'),
    sanitizeCell(formatOperationalSummary(log))
  ]);

  const allLines = [
    ...metaRows.map((r) => r.join(',')),
    headers.map(sanitizeCell).join(','),
    ...rows.map((r) => r.join(','))
  ];

  return '\uFEFF' + allLines.join('\r\n');
};

/**
 * Triggers a browser file download of the CSV data.
 * @param {Array} logs
 * @param {object} [filters] - { dateRange: { from, to }, actionType, searchKeyword }
 * @param {string} [adminEmail] - Generating administrator's email or identity
 * @returns {boolean}
 */
export const downloadAuditLogsCsv = (logs = [], filters = {}, adminEmail = '') => {
  const csvContent = generateAuditLogsCsv(logs, filters, adminEmail);
  if (!csvContent) return false;
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;

  const dateRange = filters?.dateRange || (filters?.from ? filters : {});
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `cinnamon_bistro_audit_trail_${dateRange.from || 'all'}_to_${dateRange.to || 'all'}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

/**
 * Safely loads the brand logo image for PDF rendering.
 * Checks existing DOM element or creates a new Image instance.
 * @returns {Promise<HTMLImageElement|null>}
 */
export const loadLogoImage = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  try {
    const existing = document.querySelector('img[src*="brand-logo"]');
    if (existing && existing.complete && existing.naturalWidth > 0) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/brand-logo.png';
    });
  } catch {
    return Promise.resolve(null);
  }
};

/**
 * Generates and downloads an organized, branded PDF audit report (SR-223 / SR-253).
 * Redesigned to match web theme with brand logo, executive card, and friendly action names.
 * @param {Array} logs - Array of audit log objects
 * @param {object} filters - { dateRange: { from, to }, actionType, searchKeyword }
 * @param {string} [adminEmail] - Generating administrator's email or identity
 * @returns {Promise<object|null>} jsPDF document instance or null if empty
 */
export const downloadAuditLogsPdf = async (logs = [], filters = {}, adminEmail = '') => {
  if (!logs || logs.length === 0) return null;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;

  // 1. Dual Accent Top Strip matching Cinnamon Bistro branding
  doc.setFillColor(197, 160, 89); // Gold
  doc.rect(0, 0, pageWidth, 2.8, 'F');
  doc.setFillColor(30, 41, 59); // Navy
  doc.rect(0, 2.8, pageWidth, 1.2, 'F');

  // 2. Brand Logo & Typography
  const logoImg = await loadLogoImage();
  let hasImageLogo = false;

  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', margin, 7.5, 42, 11.35, undefined, 'FAST');
      hasImageLogo = true;
    } catch {
      hasImageLogo = false;
    }
  }

  if (!hasImageLogo) {
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text('CINNAMON BISTRO', margin, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(197, 160, 89);
    doc.text('LUXURY DINING & MANAGEMENT SYSTEM', margin, 18);
  }

  // Eyebrow & Page Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 130, 60); // Bronze gold
  doc.text('SECURITY & COMPLIANCE   •   OFFICIAL AUDIT TRAIL', margin, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(32, 26, 21); // Dark ink
  doc.text('Admin Audit Trail & Activity Log', margin, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(107, 114, 128); // Muted grey
  doc.text(
    'Authoritative, immutable tracking of administrative operations, user lifecycle updates, menu changes, and table modifications.',
    margin,
    32.5
  );

  // 3. Right Side: Official Verification Card
  const cardWidth = 78;
  const cardHeight = 25;
  const cardX = pageWidth - margin - cardWidth;
  const cardY = 7.5;

  doc.setFillColor(252, 250, 246); // Warm bistro sand
  doc.setDrawColor(232, 224, 208); // Bistro border
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

  // Badge pill
  doc.setFillColor(197, 160, 89);
  doc.roundedRect(cardX + 4, cardY + 3.5, 36, 4.2, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL AUDIT REPORT', cardX + 6, cardY + 6.5);

  const genUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(75, 85, 99);
  doc.text(`Generated: ${genUtc}`, cardX + 4, cardY + 12);
  doc.text(`Auditor: ${adminEmail || 'System Administrator'}`, cardX + 4, cardY + 16.5);
  doc.text('Ledger: Append-Only Immutable Store', cardX + 4, cardY + 21);

  // 4. Metric & Filter Overview Bar (matching web card)
  const barY = 36;
  const barHeight = 8.5;
  doc.setFillColor(250, 248, 244);
  doc.setDrawColor(232, 224, 208);
  doc.roundedRect(margin, barY, pageWidth - margin * 2, barHeight, 1.5, 1.5, 'FD');

  const fromDate = filters?.dateRange?.from || 'Start';
  const toDate = filters?.dateRange?.to || 'Present';
  const actionLabel = filters?.actionType ? formatActionType(filters.actionType).label : 'All Actions';
  const searchLabel = filters?.searchKeyword ? `"${filters.searchKeyword}"` : 'None';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);

  // 4 Segments across the bar
  doc.text('Period: ', margin + 4, barY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`${fromDate} to ${toDate}`, margin + 15, barY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Action Filter: ', margin + 70, barY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(actionLabel, margin + 88, barY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Search Keyword: ', margin + 138, barY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(searchLabel, margin + 160, barY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Total Events: ', margin + 208, barY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`${logs.length} Records`, margin + 226, barY + 5.5);

  // 5. Data Table
  const tableData = logs.map((log) => {
    const timestamp = log.timestampUtc
      ? log.timestampUtc.replace('T', ' ').substring(0, 19)
      : 'N/A';
    // User requested: ONLY the friendly action label, NO parentheses with raw codes!
    const action = formatActionType(log.actionType).label;
    const admin = `${log.adminEmail || 'Unknown'}${log.adminRole ? `\n[${log.adminRole}]` : ''}`;
    const target = `${log.targetType || 'N/A'}${log.targetId ? ` #${log.targetId}` : ''}`;
    const result = log.result || 'Success';
    const operationalDetails = formatOperationalSummary(log);

    return [timestamp, action, admin, target, result, operationalDetails];
  });

  autoTable(doc, {
    startY: 47.5,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [['Timestamp (UTC)', 'Action Type', 'Administrator', 'Target Resource', 'Result', 'Operational Change Summary']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2.3,
      textColor: [32, 26, 21],
      lineColor: [232, 224, 208],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [30, 41, 59], // Navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [252, 250, 246]
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 36 },
      2: { cellWidth: 46 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw || '').toLowerCase();
        if (text === 'success') {
          data.cell.styles.textColor = [4, 120, 87]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('denied') || text.includes('failed')) {
          data.cell.styles.textColor = [153, 27, 27]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // 6. Page Numbering & Footer across all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(
      'Strictly Confidential - Cinnamon Bistro Administrative Audit Trail - For Internal Auditing & Compliance Only',
      margin,
      pageHeight - 6.5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // 7. Download / Save File
  const filename = `cinnamon_bistro_audit_report_${filters?.dateRange?.from || 'all'}_to_${filters?.dateRange?.to || 'all'}.pdf`;
  if (typeof window !== 'undefined' && typeof doc.save === 'function') {
    doc.save(filename);
  }

  return doc;
};


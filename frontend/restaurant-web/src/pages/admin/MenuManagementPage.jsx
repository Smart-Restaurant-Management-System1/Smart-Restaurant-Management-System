import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem,
} from '../../services/menuService';

const CATEGORIES = [
  'Appetizer',
  'Main Course',
  'Dessert',
  'Beverage',
  'Side Dish',
];

const DIETARY_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Halal',
  'Gluten-Free',
];

const EMPTY_FORM = {
  itemName: '',
  description: '',
  price: '',
  category: 'Main Course',
  dietaryInfo: 'None',
  imageReference: '',
  isAvailable: true,
};

function MenuImageThumbnail({ src, alt }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = typeof src === 'string' ? src.trim() : '';

  if (!imageUrl || imageError) {
    return (
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '10px',
          backgroundColor: '#f5eedf',
          border: '1px solid #dfd2be',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8c6736',
          flexShrink: 0,
          boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
        }}
        title="No image preview"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Menu dish'}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '10px',
        objectFit: 'cover',
        border: '1px solid #dfd8cb',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(40,30,15,0.08)',
      }}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}

import {
  calculateMenuMetrics,
  validateMenuItemPayload,
} from '../../components/menu/menuValidation';

export default function MenuManagementPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getMenuItems({
        search,
        category,
        isAvailable: availability,
      });

      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading menu items:', err);
      setError(
        err.response?.data?.message ||
          'Unable to load menu items. Please check that the reservation service is online.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, [search, category, availability]);

  const metrics = useMemo(() => calculateMenuMetrics(menuItems), [menuItems]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setError('');
    setSuccessMessage('');
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName || '',
      description: item.description || '',
      price: item.price || '',
      category: item.category || 'Main Course',
      dietaryInfo: item.dietaryInfo || 'None',
      imageReference: item.imageReference || '',
      isAvailable: item.isAvailable ?? true,
    });
    setError('');
    setSuccessMessage('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const validation = validateMenuItemPayload(formData);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    const payload = {
      itemName: formData.itemName.trim(),
      description: formData.description.trim() || null,
      price: Number(formData.price),
      category: formData.category,
      dietaryInfo: formData.dietaryInfo,
      imageReference: formData.imageReference.trim() || null,
      isAvailable: formData.isAvailable,
    };

    try {
      setSaving(true);
      if (editingItem) {
        await updateMenuItem(editingItem.menuItemId, payload);
        setSuccessMessage(`Dish "${payload.itemName}" updated successfully.`);
      } else {
        await createMenuItem(payload);
        setSuccessMessage(`Dish "${payload.itemName}" added to menu successfully.`);
      }

      closeForm();
      await loadMenuItems();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error saving menu item:', err);
      setError(
        err.response?.data?.message || 'Unable to save menu item. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = async (item) => {
    try {
      setError('');
      setSuccessMessage('');

      await updateMenuItemAvailability(item.menuItemId, !item.isAvailable);

      setSuccessMessage(
        `"${item.itemName}" marked as ${!item.isAvailable ? 'Available' : 'Unavailable'}.`
      );

      await loadMenuItems();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error updating availability:', err);
      setError(
        err.response?.data?.message || 'Unable to update menu item availability.'
      );
    }
  };

  const handlePromptDelete = (item) => {
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    const itemToDelete = deleteConfirmItem;

    try {
      setDeletingItemId(itemToDelete.menuItemId);
      setError('');
      setSuccessMessage('');

      await deleteMenuItem(itemToDelete.menuItemId);

      setSuccessMessage(`"${itemToDelete.itemName}" was deleted from menu.`);
      setDeleteConfirmItem(null);

      if (editingItem && editingItem.menuItemId === itemToDelete.menuItemId) {
        closeForm();
      }

      await loadMenuItems();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error deleting menu item:', err);
      setError(
        err.response?.data?.message || 'Unable to delete menu item. Please try again.'
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  const dietaryBadgeStyle = (dietary) => {
    switch (dietary) {
      case 'Vegetarian':
        return { backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
      case 'Vegan':
        return { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'Halal':
        return { backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      case 'Gluten-Free':
        return { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header with Compact Metric Badges */}
      <PageHeader
        eyebrow="Culinary Administration"
        title={<>Menu & Dish <em>Management</em></>}
        subtitle="Curate exquisite culinary creations, control dish pricing, manage dietary classifications, and adjust real-time menu availability."
        actions={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Total Menu Items */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dfd8cb',
                borderRadius: '10px',
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
              title="Total dishes in restaurant catalog"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#faf5ea',
                  color: 'var(--bistro-bronze)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bistro-muted)', fontWeight: 700 }}>
                  Total Items
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--bistro-ink)', lineHeight: 1.1 }}>
                  {metrics.total}
                </div>
              </div>
            </div>

            {/* Available to Order */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
              title="Dishes currently available to order"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#166534', fontWeight: 700 }}>
                  Available
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', lineHeight: 1.1 }}>
                  {metrics.available}
                </div>
              </div>
            </div>

            {/* Sold Out / Inactive */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
              title="Dishes marked sold out or inactive"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', fontWeight: 700 }}>
                  Sold Out
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', lineHeight: 1.1 }}>
                  {metrics.unavailable}
                </div>
              </div>
            </div>

            {/* Categories Offered */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dfd8cb',
                borderRadius: '10px',
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
              title="Total distinct menu categories"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#faf5ea',
                  color: 'var(--bistro-bronze)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bistro-bronze)', fontWeight: 700 }}>
                  Categories
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--bistro-bronze)', lineHeight: 1.1 }}>
                  {metrics.categoriesCount}
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Alerts */}
      {successMessage && (
        <div className="bistro-alert bistro-alert-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bistro-alert bistro-alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Menu Items Table Card */}
      <div
        className="bistro-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(40, 33, 21, 0.06)',
          border: '1px solid #dfd8cb',
          borderRadius: '16px',
        }}
      >
        {/* Top Accent Strip */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)' }} />

        {/* Toolbar Header */}
        <div
          style={{
            padding: '1.1rem 1.6rem',
            borderBottom: '1px solid #dfd8cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#faf6ee',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left: Title & Count */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.28rem', color: 'var(--bistro-ink)', margin: 0, fontWeight: 700 }}>
                Culinary Dishes Catalog
              </h2>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.6rem',
                  background: '#eee3cf',
                  color: '#6b532f',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {menuItems.length} {menuItems.length === 1 ? 'dish' : 'dishes'}
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--bistro-muted)' }}>
              Real-time dining menu pricing, dietary classifications, and stock status
            </p>
          </div>

          {/* Middle: Integrated Filter Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              flex: '1 1 380px',
              maxWidth: '560px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 170px', minWidth: '150px' }}>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dish or ingredients..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                  fontSize: '0.84rem',
                  border: '1px solid #d4cbbd',
                  borderRadius: '7px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8c7e6d"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Category Dropdown */}
            <div style={{ flex: '1 1 125px', minWidth: '115px' }}>
              <select
                id="filterCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.84rem',
                  border: '1px solid #d4cbbd',
                  borderRadius: '7px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: 'var(--bistro-ink)',
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Dropdown */}
            <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
              <select
                id="availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.84rem',
                  border: '1px solid #d4cbbd',
                  borderRadius: '7px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: 'var(--bistro-ink)',
                }}
              >
                <option value="">All Items</option>
                <option value="true">Available Only</option>
                <option value="false">Unavailable Only</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(search || category || availability) && (
              <button
                type="button"
                className="bistro-button-outline"
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setAvailability('');
                }}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  borderRadius: '6px',
                }}
                title="Clear all active filters"
              >
                Reset
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              className="bistro-button-gold"
              onClick={openAddForm}
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.86rem',
                boxShadow: '0 2px 8px rgba(197, 160, 89, 0.3)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Food to Menu
            </button>
            <button
              type="button"
              className="bistro-button-outline"
              onClick={loadMenuItems}
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.86rem' }}
              title="Refresh list"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#6b7280' }}>
            <svg
              style={{
                animation: 'spin 1s linear infinite',
                width: '30px',
                height: '30px',
                margin: '0 auto 1rem',
                display: 'block',
                color: '#d4af37',
              }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="10" stroke="#f3f4f6" strokeWidth="4" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--bistro-muted)' }}>Loading culinary dishes catalog…</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '0.4rem' }}>
              No menu items found
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {search || category || availability
                ? 'No items match your selected filter criteria. Try adjusting the search or filters.'
                : 'Your dining catalog currently has no dishes configured. Click below to add your first menu item.'}
            </p>
            <button
              type="button"
              onClick={openAddForm}
              className="bistro-button-gold"
              style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}
            >
              + Add Menu Item
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f5efe6', borderBottom: '1px solid #dfd8cb' }}>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532' }}>
                    Dish Creation
                  </th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532' }}>
                    Category
                  </th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532' }}>
                    Price
                  </th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532' }}>
                    Dietary Info
                  </th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532' }}>
                    Availability
                  </th>
                  <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#534532', textAlign: 'right', width: '145px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item, idx) => (
                  <tr
                    key={item.menuItemId}
                    style={{
                      borderBottom: idx === menuItems.length - 1 ? 'none' : '1px solid #eee5d7',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbf8f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Dish name, thumbnail, description */}
                    <td style={{ padding: '0.95rem 1.25rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MenuImageThumbnail src={item.imageReference} alt={item.itemName} />
                        <div>
                          <div style={{ fontFamily: 'Georgia, serif', fontWeight: '700', color: 'var(--bistro-ink)', fontSize: '1.02rem', lineHeight: 1.3 }}>
                            {item.itemName}
                          </div>
                          {item.description && (
                            <div style={{ fontSize: '0.82rem', color: '#6c5e4d', marginTop: '0.2rem', maxWidth: '360px', lineHeight: '1.45' }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.95rem 1.25rem', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          background: '#f4ede1',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          color: '#6b532f',
                          border: '1px solid #ddd2bf',
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '0.95rem 1.25rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bistro-bronze)' }}>Rs.</span>
                        <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.08rem', fontWeight: 700, color: 'var(--bistro-ink)' }}>
                          {Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>

                    {/* Dietary Info */}
                    <td style={{ padding: '0.95rem 1.25rem', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.7rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          ...dietaryBadgeStyle(item.dietaryInfo),
                        }}
                      >
                        {item.dietaryInfo || 'None'}
                      </span>
                    </td>

                    {/* Availability */}
                    <td style={{ padding: '0.95rem 1.25rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {item.isAvailable ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.28rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                            }}
                          />
                          Available
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.28rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#f59e0b',
                            }}
                          />
                          Unavailable
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1.25rem', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          alignItems: 'stretch',
                          width: '125px',
                          marginLeft: 'auto',
                        }}
                      >
                        {/* Edit Button */}
                        <button
                          type="button"
                          className="bistro-button-outline"
                          onClick={() => openEditForm(item)}
                          disabled={deletingItemId === item.menuItemId}
                          style={{
                            padding: '0.32rem 0.65rem',
                            fontSize: '0.78rem',
                            width: '100%',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            borderRadius: '6px',
                          }}
                          title="Edit Dish"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>

                        {/* Toggle Availability Button */}
                        <button
                          type="button"
                          className="bistro-button-outline"
                          onClick={() => handleAvailabilityChange(item)}
                          disabled={deletingItemId === item.menuItemId}
                          style={{
                            padding: '0.32rem 0.65rem',
                            fontSize: '0.78rem',
                            width: '100%',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            borderRadius: '6px',
                            color: item.isAvailable ? '#b45309' : '#065f46',
                            borderColor: item.isAvailable ? '#fcd34d' : '#a7f3d0',
                            backgroundColor: item.isAvailable ? '#fffdf7' : '#f0fdf4',
                          }}
                          title={item.isAvailable ? 'Mark as sold out / unavailable' : 'Mark as available to order'}
                        >
                          {item.isAvailable ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                              Mark Sold Out
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Make Available
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="bistro-button-danger"
                          onClick={() => handlePromptDelete(item)}
                          disabled={deletingItemId === item.menuItemId}
                          style={{
                            padding: '0.32rem 0.65rem',
                            fontSize: '0.78rem',
                            width: '100%',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            borderRadius: '6px',
                          }}
                          title="Delete Dish"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Menu Item Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) closeForm();
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dfd8cb',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '92vh',
              boxShadow: '0 25px 50px -12px rgba(17, 24, 39, 0.3)',
              padding: '1.6rem 2rem',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid #eee5d7',
                paddingBottom: '0.85rem',
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.4rem',
                    color: 'var(--bistro-ink)',
                    margin: 0,
                  }}
                >
                  {editingItem ? 'Edit Culinary Dish' : 'Add New Menu Item'}
                </h2>
                <p
                  style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--bistro-muted)',
                  }}
                >
                  Configure dish pricing, dietary categories, and presentation for the restaurant catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  lineHeight: '1',
                  padding: '0.25rem',
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Landscape 2-Column Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                {/* Left Column: Dish Basics & Pricing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Dish Name */}
                  <div>
                    <label
                      htmlFor="formItemName"
                      style={{
                        display: 'block',
                        fontSize: '0.84rem',
                        fontWeight: '600',
                        color: 'var(--bistro-ink)',
                        marginBottom: '0.3rem',
                      }}
                    >
                      Dish Name *
                    </label>
                    <input
                      id="formItemName"
                      name="itemName"
                      type="text"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      placeholder="e.g. Ceylon Spiced Lagoon Crab"
                      maxLength="150"
                      required
                      style={{
                        width: '100%',
                        padding: '0.62rem 0.8rem',
                        fontSize: '0.9rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Category & Price (2 Columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label
                        htmlFor="formCategory"
                        style={{
                          display: 'block',
                          fontSize: '0.84rem',
                          fontWeight: '600',
                          color: 'var(--bistro-ink)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Menu Category *
                      </label>
                      <select
                        id="formCategory"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.62rem 0.8rem',
                          fontSize: '0.9rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        {CATEGORIES.map((itemCategory) => (
                          <option key={itemCategory} value={itemCategory}>
                            {itemCategory}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="formPrice"
                        style={{
                          display: 'block',
                          fontSize: '0.84rem',
                          fontWeight: '600',
                          color: 'var(--bistro-ink)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Price (Rs.) *
                      </label>
                      <input
                        id="formPrice"
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="e.g. 2800.00"
                        min="0.01"
                        step="0.01"
                        required
                        style={{
                          width: '100%',
                          padding: '0.62rem 0.8rem',
                          fontSize: '0.9rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Dietary Classification & Available to Order */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div>
                      <label
                        htmlFor="formDietaryInfo"
                        style={{
                          display: 'block',
                          fontSize: '0.84rem',
                          fontWeight: '600',
                          color: 'var(--bistro-ink)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Dietary Info
                      </label>
                      <select
                        id="formDietaryInfo"
                        name="dietaryInfo"
                        value={formData.dietaryInfo}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.62rem 0.8rem',
                          fontSize: '0.9rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        {DIETARY_OPTIONS.map((dietaryOption) => (
                          <option key={dietaryOption} value={dietaryOption}>
                            {dietaryOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ paddingBottom: '0.45rem' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                          color: 'var(--bistro-ink)',
                          fontWeight: '500',
                        }}
                      >
                        <input
                          type="checkbox"
                          name="isAvailable"
                          checked={formData.isAvailable}
                          onChange={handleInputChange}
                          style={{ width: '17px', height: '17px', accentColor: '#d4af37', cursor: 'pointer' }}
                        />
                        Available to Order
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column: Description & Image Reference */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Dish Description */}
                  <div>
                    <label
                      htmlFor="formDescription"
                      style={{
                        display: 'block',
                        fontSize: '0.84rem',
                        fontWeight: '600',
                        color: 'var(--bistro-ink)',
                        marginBottom: '0.3rem',
                      }}
                    >
                      Dish Description
                    </label>
                    <textarea
                      id="formDescription"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe flavor notes, artisan ingredients, and presentation..."
                      rows="3"
                      maxLength="1000"
                      style={{
                        width: '100%',
                        padding: '0.62rem 0.8rem',
                        fontSize: '0.88rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Image Reference */}
                  <div>
                    <label
                      htmlFor="formImageReference"
                      style={{
                        display: 'block',
                        fontSize: '0.84rem',
                        fontWeight: '600',
                        color: 'var(--bistro-ink)',
                        marginBottom: '0.3rem',
                      }}
                    >
                      Image Reference (Direct URL)
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        id="formImageReference"
                        name="imageReference"
                        type="url"
                        value={formData.imageReference}
                        onChange={handleInputChange}
                        placeholder="https://images.unsplash.com/photo-..."
                        maxLength="500"
                        style={{
                          flex: 1,
                          padding: '0.62rem 0.8rem',
                          fontSize: '0.88rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <MenuImageThumbnail src={formData.imageReference} alt="Preview" />
                    </div>
                    <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Paste image URL (jpg, webp, png) for live preview thumbnail.
                    </small>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid #eee5d7',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  className="bistro-button-outline"
                  onClick={closeForm}
                  disabled={saving}
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bistro-button-gold"
                  disabled={saving}
                  style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem' }}
                >
                  {saving
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Dish'
                    : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup Modal */}
      {deleteConfirmItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingItemId) setDeleteConfirmItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #fee2e2',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(17, 24, 39, 0.3)',
              padding: '2rem',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.35rem',
                color: 'var(--bistro-ink)',
                margin: '0 0 0.5rem 0',
              }}
            >
              Remove Menu Item?
            </h2>

            <p style={{ color: 'var(--bistro-muted)', fontSize: '0.92rem', lineHeight: '1.55', marginBottom: '1.75rem' }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--bistro-ink)' }}>"{deleteConfirmItem.itemName}"</strong> from the restaurant catalog? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={Boolean(deletingItemId)}
                className="bistro-button-outline"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingItemId)}
                className="bistro-button-danger"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {deletingItemId ? 'Deleting...' : 'Delete Dish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
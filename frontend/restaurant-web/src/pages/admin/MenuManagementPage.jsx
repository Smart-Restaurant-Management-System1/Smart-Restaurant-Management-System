import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
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

function MenuImage({ src, alt, className = '' }) {
  const [imageError, setImageError] = useState(false);

  const imageUrl = typeof src === 'string' ? src.trim() : '';

  if (!imageUrl || imageError) {
    return (
      <div className={`menu-image-placeholder ${className}`}>
        <span>🍽️</span>
        <small>No Image</small>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Menu item'}
      className={`menu-item-image ${className}`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}

function MenuManagementPage() {
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
          'Unable to load menu items. Please check the backend service.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, [search, category, availability]);

  const metrics = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter(
      (item) => item.isAvailable
    ).length;
    const unavailable = total - available;

    return {
      total,
      available,
      unavailable,
    };
  }, [menuItems]);

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

    if (!formData.itemName.trim()) {
      setError('Item name is required.');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setError('Please enter a valid price greater than zero.');
      return;
    }

    if (formData.imageReference.trim()) {
      try {
        const imageUrl = new URL(
          formData.imageReference.trim()
        );

        if (!['http:', 'https:'].includes(imageUrl.protocol)) {
          setError(
            'Image URL must begin with http:// or https://.'
          );
          return;
        }
      } catch {
        setError('Please enter a valid image URL.');
        return;
      }
    }

    const payload = {
      itemName: formData.itemName.trim(),
      description: formData.description.trim() || null,
      price: Number(formData.price),
      category: formData.category,
      dietaryInfo: formData.dietaryInfo,
      imageReference:
        formData.imageReference.trim() || null,
      isAvailable: formData.isAvailable,
    };

    try {
      setSaving(true);

      if (editingItem) {
        await updateMenuItem(
          editingItem.menuItemId,
          payload
        );

        setSuccessMessage(
          'Menu item updated successfully.'
        );
      } else {
        await createMenuItem(payload);

        setSuccessMessage(
          'Menu item created successfully.'
        );
      }

      closeForm();
      await loadMenuItems();
    } catch (err) {
      console.error('Error saving menu item:', err);

      setError(
        err.response?.data?.message ||
          'Unable to save menu item. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = async (item) => {
    try {
      setError('');
      setSuccessMessage('');

      await updateMenuItemAvailability(
        item.menuItemId,
        !item.isAvailable
      );

      setSuccessMessage(
        `Menu item ${
          item.isAvailable ? 'disabled' : 'enabled'
        } successfully.`
      );

      await loadMenuItems();
    } catch (err) {
      console.error('Error updating availability:', err);

      setError(
        err.response?.data?.message ||
          'Unable to update menu item availability.'
      );
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.itemName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingItemId(item.menuItemId);
      setError('');
      setSuccessMessage('');

      await deleteMenuItem(item.menuItemId);

      setSuccessMessage(
        'Menu item deleted successfully.'
      );

      if (
        editingItem &&
        editingItem.menuItemId === item.menuItemId
      ) {
        closeForm();
      }

      await loadMenuItems();
    } catch (err) {
      console.error('Error deleting menu item:', err);

      setError(
        err.response?.data?.message ||
          'Unable to delete menu item. Please try again.'
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Restaurant Menu & Items"
        subtitle="Create, update, and manage restaurant menu items."
      >
        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Menu Item
        </button>
      </PageHeader>

      <div className="menu-metrics-grid">
        <div className="menu-metric-card">
          <span className="menu-metric-label">
            Total Items
          </span>

          <strong className="menu-metric-value">
            {metrics.total}
          </strong>
        </div>

        <div className="menu-metric-card">
          <span className="menu-metric-label">
            Available Items
          </span>

          <strong className="menu-metric-value">
            {metrics.available}
          </strong>
        </div>

        <div className="menu-metric-card">
          <span className="menu-metric-label">
            Unavailable Items
          </span>

          <strong className="menu-metric-value">
            {metrics.unavailable}
          </strong>
        </div>
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showForm && (
        <div className="menu-form-card">
          <div className="menu-form-header">
            <h2>
              {editingItem
                ? 'Edit Menu Item'
                : 'Add Menu Item'}
            </h2>

            <button
              type="button"
              className="secondary-button"
              onClick={closeForm}
              disabled={saving}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="menu-form-grid">
              <div className="form-group">
                <label htmlFor="itemName">
                  Item Name *
                </label>

                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                  maxLength="150"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">
                  Price *
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Enter price"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">
                  Category *
                </label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  {CATEGORIES.map((itemCategory) => (
                    <option
                      key={itemCategory}
                      value={itemCategory}
                    >
                      {itemCategory}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dietaryInfo">
                  Dietary Information
                </label>

                <select
                  id="dietaryInfo"
                  name="dietaryInfo"
                  value={formData.dietaryInfo}
                  onChange={handleInputChange}
                >
                  {DIETARY_OPTIONS.map((dietaryOption) => (
                    <option
                      key={dietaryOption}
                      value={dietaryOption}
                    >
                      {dietaryOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group menu-form-full-width">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter item description"
                  rows="4"
                  maxLength="1000"
                />
              </div>

              <div className="form-group menu-form-full-width">
                <label htmlFor="imageReference">
                  Image URL
                </label>

                <input
                  id="imageReference"
                  name="imageReference"
                  type="url"
                  value={formData.imageReference}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  maxLength="500"
                />

                <small className="form-help-text">
                  Paste the direct image URL copied from the
                  image source, not the Google search page URL.
                </small>

                {formData.imageReference.trim() && (
                  <div className="menu-image-preview-container">
                    <p className="menu-image-preview-label">
                      Image Preview
                    </p>

                    <MenuImage
                      src={formData.imageReference}
                      alt={
                        formData.itemName ||
                        'Image preview'
                      }
                      className="menu-image-preview"
                    />
                  </div>
                )}
              </div>

              <div className="form-group menu-form-full-width">
                <label className="menu-checkbox-label">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={formData.isAvailable}
                    onChange={handleInputChange}
                  />

                  Item is available
                </label>
              </div>
            </div>

            <div className="menu-form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingItem
                  ? 'Update Item'
                  : 'Create Item'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="menu-filter-card">
        <div className="form-group">
          <label htmlFor="search">
            Search Items
          </label>

          <input
            id="search"
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by item name or description"
          />
        </div>

        <div className="form-group">
          <label htmlFor="filterCategory">
            Category
          </label>

          <select
            id="filterCategory"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >
            <option value="">
              All Categories
            </option>

            {CATEGORIES.map((itemCategory) => (
              <option
                key={itemCategory}
                value={itemCategory}
              >
                {itemCategory}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="availability">
            Availability
          </label>

          <select
            id="availability"
            value={availability}
            onChange={(event) =>
              setAvailability(event.target.value)
            }
          >
            <option value="">
              All Items
            </option>

            <option value="true">
              Available
            </option>

            <option value="false">
              Unavailable
            </option>
          </select>
        </div>
      </div>

      <div className="menu-table-card">
        <div className="menu-table-header">
          <h2>
            Menu Items
          </h2>
        </div>

        {loading ? (
          <div className="menu-empty-state">
            Loading menu items...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="menu-empty-state">
            No menu items found.
          </div>
        ) : (
          <div className="menu-table-wrapper">
            <table className="menu-table">
              <thead>
                <tr>
                  <th className="menu-table-heading">
                    Image
                  </th>

                  <th className="menu-table-heading">
                    Item
                  </th>

                  <th className="menu-table-heading">
                    Category
                  </th>

                  <th className="menu-table-heading">
                    Price
                  </th>

                  <th className="menu-table-heading">
                    Dietary Info
                  </th>

                  <th className="menu-table-heading">
                    Status
                  </th>

                  <th className="menu-table-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.menuItemId}>
                    <td className="menu-table-cell">
                      <MenuImage
                        src={item.imageReference}
                        alt={item.itemName}
                      />
                    </td>

                    <td className="menu-table-cell">
                      <strong>
                        {item.itemName}
                      </strong>

                      {item.description && (
                        <div className="menu-item-description">
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td className="menu-table-cell">
                      {item.category}
                    </td>

                    <td className="menu-table-cell">
                      Rs. {Number(item.price).toFixed(2)}
                    </td>

                    <td className="menu-table-cell">
                      {item.dietaryInfo || 'None'}
                    </td>

                    <td className="menu-table-cell">
                      <span
                        className={`menu-status ${
                          item.isAvailable
                            ? 'available'
                            : 'unavailable'
                        }`}
                      >
                        {item.isAvailable
                          ? 'Available'
                          : 'Unavailable'}
                      </span>
                    </td>

                    <td className="menu-table-cell">
                      <div className="menu-action-buttons">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            openEditForm(item)
                          }
                          disabled={
                            deletingItemId ===
                            item.menuItemId
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            handleAvailabilityChange(item)
                          }
                          disabled={
                            deletingItemId ===
                            item.menuItemId
                          }
                        >
                          {item.isAvailable
                            ? 'Disable'
                            : 'Enable'}
                        </button>

                        <button
                          type="button"
                          className="small-button delete-button"
                          onClick={() =>
                            handleDelete(item)
                          }
                          disabled={
                            deletingItemId ===
                            item.menuItemId
                          }
                        >
                          {deletingItemId ===
                          item.menuItemId
                            ? 'Deleting...'
                            : 'Delete'}
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
    </div>
  );
}

export default MenuManagementPage;

import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getCustomerMenuItems } from '../../services/menuService';

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

function CustomerMenuImage({ src, alt }) {
  const [imageError, setImageError] = useState(false);

  const imageUrl = typeof src === 'string' ? src.trim() : '';

  if (!imageUrl || imageError) {
    return (
      <div className="customer-menu-image-placeholder">
        <span aria-hidden="true">🍽️</span>
        <span>No Image</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Menu item'}
      className="customer-menu-image"
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
}

function CustomerMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dietaryInfo, setDietaryInfo] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomerMenu = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getCustomerMenuItems({
        search,
        category,
        dietaryInfo,
      });

      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading customer menu:', err);

      setMenuItems([]);

      setError(
        err.response?.data?.message ||
          'Unable to load the menu. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerMenu();
  }, [search, category, dietaryInfo]);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDietaryInfo('');
  };

  return (
    <div className="page-container customer-menu-page">
      <PageHeader
        title="Explore Our Menu"
        subtitle="Discover delicious dishes prepared for your dining experience."
      />

      <section className="customer-menu-filter-card">
        <div className="customer-menu-filter-heading">
          <div>
            <h2>Find Your Favourite</h2>
            <p>Search and filter available menu items.</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
            disabled={!search && !category && !dietaryInfo}
          >
            Clear Filters
          </button>
        </div>

        <div className="customer-menu-filter-grid">
          <div className="form-group">
            <label htmlFor="customerMenuSearch">
              Search
            </label>

            <input
              id="customerMenuSearch"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu items..."
              maxLength="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerMenuCategory">
              Category
            </label>

            <select
              id="customerMenuCategory"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All Categories</option>

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
            <label htmlFor="customerMenuDietaryInfo">
              Dietary Preference
            </label>

            <select
              id="customerMenuDietaryInfo"
              value={dietaryInfo}
              onChange={(event) =>
                setDietaryInfo(event.target.value)
              }
            >
              <option value="">All Preferences</option>

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
        </div>
      </section>

      {error && (
        <div className="error-message customer-menu-error">
          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={loadCustomerMenu}
          >
            Retry
          </button>
        </div>
      )}

      <section className="customer-menu-results">
        <div className="customer-menu-results-header">
          <h2>Available Menu Items</h2>

          {!loading && !error && (
            <span className="customer-menu-results-count">
              {menuItems.length} item
              {menuItems.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="customer-menu-state">
            <div className="customer-menu-loading-spinner" />
            <p>Loading menu items...</p>
          </div>
        ) : error ? (
          <div className="customer-menu-state">
            <p>We could not load the menu.</p>
            <button
              type="button"
              className="primary-button"
              onClick={loadCustomerMenu}
            >
              Try Again
            </button>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="customer-menu-state">
            <span className="customer-menu-state-icon">
              🍽️
            </span>

            <h3>No Menu Items Found</h3>

            <p>
              There are no available items matching your
              selected filters.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="customer-menu-grid">
            {menuItems.map((item) => (
              <article
                className="customer-menu-card"
                key={item.menuItemId}
              >
                <div className="customer-menu-card-image">
                  <CustomerMenuImage
                    src={item.imageReference}
                    alt={item.itemName}
                  />

                  <span className="customer-menu-category-badge">
                    {item.category}
                  </span>
                </div>

                <div className="customer-menu-card-content">
                  <div className="customer-menu-card-heading">
                    <h3>{item.itemName}</h3>

                    <strong className="customer-menu-price">
                      Rs. {Number(item.price).toFixed(2)}
                    </strong>
                  </div>

                  {item.description && (
                    <p className="customer-menu-description">
                      {item.description}
                    </p>
                  )}

                  <div className="customer-menu-card-footer">
                    <span className="customer-menu-dietary-badge">
                      {item.dietaryInfo || 'None'}
                    </span>

                    <span className="customer-menu-availability">
                      Available
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CustomerMenuPage;
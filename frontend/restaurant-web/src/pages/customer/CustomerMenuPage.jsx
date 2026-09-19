
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getCustomerMenuItems } from '../../services/menuService';
import { addCartItem } from '../../services/cartService';

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

const CATEGORY_ICONS = {
  All: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),

  Appetizer: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),

  'Main Course': (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 3v18" />
      <path d="M8 3v7a2 2 0 0 1-4 0V3" />
      <path d="M6 10v11" />
      <path d="M14 3v18" />
      <path d="M14 3c4 2 4 6 0 8" />
      <path d="M18 3v18" />
    </svg>
  ),

  Dessert: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),

  Beverage: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 22h8" />
      <path d="M12 15v7" />
      <path d="M5 3h14l-1.5 8.5a5.5 5.5 0 0 1-11 0L5 3z" />
    </svg>
  ),

  'Side Dish': (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const getDietaryBadge = (dietary) => {
  const norm = (dietary || '').toLowerCase();

  if (norm.includes('veg') && !norm.includes('non')) {
    return {
      label: dietary,
      bg: '#ecfdf5',
      color: '#15803d',
      border: '#bbf7d0',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      ),
    };
  }

  if (norm.includes('halal')) {
    return {
      label: dietary,
      bg: '#fffbeb',
      color: '#b45309',
      border: '#fde68a',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      ),
    };
  }

  if (norm.includes('gluten')) {
    return {
      label: dietary,
      bg: '#eef2ff',
      color: '#4338ca',
      border: '#c7d2fe',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    };
  }

  if (norm.includes('none') || !dietary) {
    return {
      label: 'Standard',
      bg: '#f5efe6',
      color: '#78716c',
      border: '#e8dfd1',
      icon: null,
    };
  }

  return {
    label: dietary,
    bg: '#f4f8f4',
    color: '#286835',
    border: '#cde4d2',
    icon: null,
  };
};

function CustomerMenuImage({ src, alt, category }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = typeof src === 'string' ? src.trim() : '';

  if (!imageUrl || imageError) {
    return (
      <div
        className="customer-menu-image-placeholder"
        style={{
          height: '160px',
          background: 'linear-gradient(135deg, #f7f1e7 0%, #ebe2d3 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          color: '#8c6736',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(140, 103, 54, 0.12)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c5a059"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 18v3" />
            <path d="M20 18v3" />
            <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
            <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
          </svg>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#8c6736',
          }}
        >
          {category || 'Cinnamon Bistro'}
        </span>
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
      style={{
        width: '100%',
        height: '160px',
        objectFit: 'cover',
        display: 'block',
        transition: 'transform 0.35s ease',
      }}
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

  const [addingItemId, setAddingItemId] = useState(null);
  const [cartMessage, setCartMessage] = useState('');
  const [cartError, setCartError] = useState('');

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

  const handleAddToCart = async (menuItemId) => {
    try {
      setAddingItemId(menuItemId);
      setCartMessage('');
      setCartError('');

      await addCartItem(menuItemId, 1);

      setCartMessage('Item added to your cart.');
    } catch (err) {
      console.error('Error adding item to cart:', err);

      setCartError(
        err.response?.data?.message ||
          'Unable to add this item to your cart. Please try again.'
      );
    } finally {
      setAddingItemId(null);
    }
  };

  const hasActiveFilters = Boolean(search || category || dietaryInfo);

  return (
    <div
      className="page-container customer-menu-page"
      style={{ maxWidth: '1240px', margin: '0 auto' }}
    >
      {/* Luxury Page Header */}
      <PageHeader
        eyebrow="Artisanal Culinary Experience"
        title={
          <>
            Explore Our <em>Menu</em>
          </>
        }
        subtitle="Discover handcrafted dishes, daily specials, and curated beverages prepared for your dining experience."
        actions={
          <Link
            to="/availability"
            className="bistro-button-gold"
            style={{ textDecoration: 'none' }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <span>Book a Table</span>
          </Link>
        }
      />

      {/* Interactive Category Filter Ribbon */}
      <div className="customer-menu-category-ribbon">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`bistro-category-pill ${!category ? 'active' : ''}`}
        >
          {CATEGORY_ICONS.All}
          <span>All Dishes</span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(category === cat ? '' : cat)}
            className={`bistro-category-pill ${
              category === cat ? 'active' : ''
            }`}
          >
            {CATEGORY_ICONS[cat]}
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Boutique Filter Toolbar */}
      <section className="customer-menu-filter-card">
        <div className="customer-menu-filter-accent-strip" />

        {/* Search Input */}
        <div className="form-group customer-menu-search-group">
          <label htmlFor="customerMenuSearch">Search Dishes</label>

          <div className="customer-menu-search-wrapper">
            <svg
              className="customer-menu-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c5a059"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              id="customerMenuSearch"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dish title or description..."
              maxLength="100"
            />
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="form-group">
          <label htmlFor="customerMenuCategory">Category</label>

          <select
            id="customerMenuCategory"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All Categories</option>

            {CATEGORIES.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
        </div>

        {/* Dietary Dropdown */}
        <div className="form-group">
          <label htmlFor="customerMenuDietaryInfo">
            Dietary Preference
          </label>

          <select
            id="customerMenuDietaryInfo"
            value={dietaryInfo}
            onChange={(event) => setDietaryInfo(event.target.value)}
          >
            <option value="">All Dietary Preferences</option>

            {DIETARY_OPTIONS.map((dietaryOption) => (
              <option key={dietaryOption} value={dietaryOption}>
                {dietaryOption === 'None'
                  ? 'Standard / All'
                  : dietaryOption}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <div className="customer-menu-clear-wrapper">
          <button
            type="button"
            className="customer-menu-clear-button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            title="Reset search and filters"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>

            <span>Reset</span>
          </button>
        </div>
      </section>

      {/* General Error Alert */}
      {error && (
        <div
          className="customer-menu-error"
          role="alert"
          style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.88rem',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>

            <span>{error}</span>
          </div>

          <button
            type="button"
            className="bistro-button-outline"
            onClick={loadCustomerMenu}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Cart Success Message */}
      {cartMessage && (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1rem',
            color: '#166534',
            fontSize: '0.88rem',
          }}
        >
          {cartMessage}
        </div>
      )}

      {/* Cart Error Message */}
      {cartError && (
        <div
          role="alert"
          style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1rem',
            color: '#991b1b',
            fontSize: '0.88rem',
          }}
        >
          {cartError}
        </div>
      )}

      {/* Menu Results Section */}
      <section className="customer-menu-results">
        <div
          className="customer-menu-results-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '1.25rem',
                color: '#282115',
                margin: 0,
                fontWeight: 600,
              }}
            >
              {category ? `${category}s` : 'Artisanal Culinary Offerings'}
            </h2>

            {!loading && !error && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f5efe6',
                  color: '#8c6736',
                  border: '1px solid #eedfc9',
                  borderRadius: '9999px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {menuItems.length}{' '}
                {menuItems.length === 1 ? 'Dish' : 'Dishes'}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div
            className="customer-menu-state"
            style={{
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #eedfc9',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(197, 160, 89, 0.25)',
                borderTopColor: '#c5a059',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '1rem',
              }}
            />

            <p
              style={{
                color: '#78716c',
                fontSize: '0.95rem',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              Loading artisanal menu items...
            </p>
          </div>
        ) : error ? (
          <div
            className="customer-menu-state"
            style={{
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #eedfc9',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#991b1b', marginBottom: '1rem' }}>
              We could not load the menu catalog.
            </p>

            <button
              type="button"
              className="bistro-button-gold"
              onClick={loadCustomerMenu}
            >
              Try Again
            </button>
          </div>
        ) : menuItems.length === 0 ? (
          <div
            className="customer-menu-state"
            style={{
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #eedfc9',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#f5efe6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '1px solid #eedfc9',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c5a059"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>

            <h3
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '1.25rem',
                color: '#282115',
                margin: '0 0 0.5rem',
              }}
            >
              No Culinary Items Found
            </h3>

            <p
              style={{
                color: '#78716c',
                maxWidth: '420px',
                fontSize: '0.88rem',
                margin: '0 0 1.25rem',
                lineHeight: 1.5,
              }}
            >
              There are no dishes matching your selected search or dietary
              filters. Try adjusting your preferences.
            </p>

            <button
              type="button"
              className="bistro-button-gold"
              onClick={clearFilters}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div
            className="customer-menu-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {menuItems.map((item) => {
              const dietaryBadge = getDietaryBadge(item.dietaryInfo);
              const isAdding = addingItemId === item.menuItemId;

              return (
                <article
                  className="customer-menu-card"
                  key={item.menuItemId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#ffffff',
                    border: '1px solid #eedfc9',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
                    transition:
                      'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  {/* Dish Image Container */}
                  <div
                    className="customer-menu-card-image"
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      height: '160px',
                      background: '#f5efe6',
                    }}
                  >
                    <CustomerMenuImage
                      src={item.imageReference}
                      alt={item.itemName}
                      category={item.category}
                    />

                    {/* Category Floating Badge */}
                    <span
                      className="customer-menu-category-badge"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        zIndex: 2,
                        background: 'rgba(40, 33, 21, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: '#f5efe6',
                        border: '1px solid rgba(197, 160, 89, 0.4)',
                        borderRadius: '9999px',
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      {item.category}
                    </span>

                    {/* Price Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid #eedfc9',
                        borderRadius: '8px',
                        padding: '0.25rem 0.65rem',
                        boxShadow: '0 2px 8px rgba(40, 33, 21, 0.12)',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.2rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#8c6736',
                        }}
                      >
                        Rs.
                      </span>

                      <span
                        style={{
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontSize: '0.98rem',
                          fontWeight: 700,
                          color: '#282115',
                        }}
                      >
                        {Number(item.price).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div
                    className="customer-menu-card-content"
                    style={{
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }}
                  >
                    <div
                      className="customer-menu-card-heading"
                      style={{ marginBottom: '0.45rem' }}
                    >
                      <h3
                        style={{
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: '#282115',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.itemName}
                      </h3>
                    </div>

                    <p
                      className="customer-menu-description"
                      style={{
                        fontSize: '0.82rem',
                        color: '#6b7280',
                        lineHeight: 1.5,
                        margin: '0 0 1rem',
                        flex: 1,
                      }}
                    >
                      {item.description ||
                        'Artisanal dish crafted with fresh seasonal ingredients.'}
                    </p>

                    {/* Card Footer */}
                    <div
                      className="customer-menu-card-footer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #f0e7db',
                        marginTop: 'auto',
                      }}
                    >
                      {/* Dietary Badge */}
                      <span
                        className="customer-menu-dietary-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: dietaryBadge.bg,
                          color: dietaryBadge.color,
                          border: `1px solid ${dietaryBadge.border}`,
                        }}
                      >
                        {dietaryBadge.icon}
                        {dietaryBadge.label}
                      </span>

                      {/* Availability Indicator */}
                      <span
                        className="customer-menu-availability"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#15803d',
                        }}
                      >
                        <span
                          className="profile-avatar-pulse-dot"
                          style={{ width: '6px', height: '6px' }}
                        />

                        Available
                      </span>

                      {/* Add to Cart Button */}
                      <button
                        type="button"
                        className="bistro-button-gold"
                        onClick={() => handleAddToCart(item.menuItemId)}
                        disabled={isAdding}
                        style={{
                          border: 'none',
                          cursor: isAdding ? 'wait' : 'pointer',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.75rem',
                          opacity: isAdding ? 0.7 : 1,
                        }}
                      >
                        {isAdding ? 'Adding...' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default CustomerMenuPage;
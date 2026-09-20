import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../../services/cartService';

const getCartItems = (cartData) => {
  if (Array.isArray(cartData)) return cartData;
  if (Array.isArray(cartData?.items)) return cartData.items;
  if (Array.isArray(cartData?.cartItems)) return cartData.cartItems;
  if (Array.isArray(cartData?.orderItems)) return cartData.orderItems;
  return [];
};

const getMenuItemId = (item) => {
  return (
    item.menuItemId ??
    item.MenuItemId ??
    item.menuItem?.menuItemId ??
    item.menuItem?.MenuItemId
  );
};

const getItemName = (item) => {
  return (
    item.itemName ??
    item.ItemName ??
    item.menuItem?.itemName ??
    item.menuItem?.ItemName ??
    'Menu Item'
  );
};

const getItemPrice = (item) => {
  const price =
    item.unitPrice ??
    item.UnitPrice ??
    item.price ??
    item.Price ??
    item.menuItem?.price ??
    item.menuItem?.Price ??
    0;

  return Number(price) || 0;
};

const getItemQuantity = (item) => {
  const quantity = item.quantity ?? item.Quantity ?? 1;
  return Number(quantity) || 1;
};

const getItemDescription = (item) => {
  return (
    item.description ??
    item.Description ??
    item.menuItem?.description ??
    item.menuItem?.Description ??
    'Freshly prepared at Cinnamon Bistro.'
  );
};

const getItemImage = (item) => {
  return (
    item.imageReference ??
    item.ImageReference ??
    item.menuItem?.imageReference ??
    item.menuItem?.ImageReference ??
    ''
  );
};

const formatCurrency = (amount) => {
  return `Rs. ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function CustomerCartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [clearingCart, setClearingCart] = useState(false);

  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadCart = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getCart();
      setCart(data);
    } catch (err) {
      console.error('Error loading cart:', err);

      setError(
        err.response?.data?.message ||
          'Unable to load your cart. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const items = useMemo(() => {
    return getCartItems(cart);
  }, [cart]);

  const calculatedTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const price = getItemPrice(item);
      const quantity = getItemQuantity(item);

      return total + price * quantity;
    }, 0);
  }, [items]);

  const getServerTotal = () => {
    if (!cart || Array.isArray(cart)) {
      return null;
    }

    const serverTotal =
      cart.totalAmount ??
      cart.TotalAmount ??
      cart.totalPrice ??
      cart.TotalPrice ??
      cart.grandTotal ??
      cart.GrandTotal;

    if (serverTotal === undefined || serverTotal === null) {
      return null;
    }

    const parsedTotal = Number(serverTotal);

    return Number.isFinite(parsedTotal) ? parsedTotal : null;
  };

  const total = getServerTotal() ?? calculatedTotal;

  const handleIncreaseQuantity = async (item) => {
    const menuItemId = getMenuItemId(item);
    const currentQuantity = getItemQuantity(item);

    if (!menuItemId) {
      setActionError('Unable to identify this cart item.');
      return;
    }

    await handleUpdateQuantity(menuItemId, currentQuantity + 1);
  };

  const handleDecreaseQuantity = async (item) => {
    const menuItemId = getMenuItemId(item);
    const currentQuantity = getItemQuantity(item);

    if (!menuItemId) {
      setActionError('Unable to identify this cart item.');
      return;
    }

    if (currentQuantity <= 1) {
      await handleRemoveItem(menuItemId);
      return;
    }

    await handleUpdateQuantity(menuItemId, currentQuantity - 1);
  };

  const handleUpdateQuantity = async (menuItemId, quantity) => {
    try {
      setUpdatingItemId(menuItemId);
      setActionError('');
      setSuccessMessage('');

      if (!Number.isInteger(quantity) || quantity < 1) {
        setActionError('Quantity must be at least 1.');
        return;
      }

      const updatedCart = await updateCartItem(menuItemId, quantity);

      setCart(updatedCart);
      setSuccessMessage('Cart quantity updated.');
    } catch (err) {
      console.error('Error updating cart quantity:', err);

      setActionError(
        err.response?.data?.message ||
          'Unable to update the item quantity. Please try again.'
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (menuItemId) => {
    try {
      setRemovingItemId(menuItemId);
      setActionError('');
      setSuccessMessage('');

      const updatedCart = await removeCartItem(menuItemId);

      setCart(updatedCart);
      setSuccessMessage('Item removed from your cart.');
    } catch (err) {
      console.error('Error removing cart item:', err);

      setActionError(
        err.response?.data?.message ||
          'Unable to remove this item. Please try again.'
      );
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to remove all items from your cart?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setClearingCart(true);
      setActionError('');
      setSuccessMessage('');

      const updatedCart = await clearCart();

      setCart(updatedCart);
      setSuccessMessage('Your cart has been cleared.');
    } catch (err) {
      console.error('Error clearing cart:', err);

      setActionError(
        err.response?.data?.message ||
          'Unable to clear your cart. Please try again.'
      );
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div
      className="page-container customer-cart-page"
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
      }}
    >
      <PageHeader
        eyebrow="Your Dining Selection"
        title={
          <>
            Your <em>Order Cart</em>
          </>
        }
        subtitle="Review your selected dishes and choose whether to dine-in now or pre-order for an upcoming reservation."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/menu"
              className="bistro-button-outline"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 3v18" />
                <path d="M8 3v7a2 2 0 0 1-4 0V3" />
                <path d="M6 10v11" />
                <path d="M14 3v18" />
                <path d="M14 3c4 2 4 6 0 8" />
                <path d="M18 3v18" />
              </svg>
              <span>Explore Menu</span>
            </Link>
          </div>
        }
      />

      {loading && (
        <div
          className="bistro-card"
          style={{
            position: 'relative',
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '14px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            color: '#78716c',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            }}
          />
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid rgba(197, 160, 89, 0.25)',
              borderTopColor: '#c5a059',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ margin: 0, fontSize: '0.92rem', fontStyle: 'italic' }}>
            Loading your culinary selection…
          </p>
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            color: '#991b1b',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.9rem' }}>{error}</p>
          <button
            type="button"
            className="bistro-button-gold"
            onClick={loadCart}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {successMessage && (
            <div
              role="status"
              style={{
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '0.85rem 1.15rem',
                color: '#166534',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              style={{
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '0.85rem 1.15rem',
                color: '#991b1b',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
              }}
            >
              {actionError}
            </div>
          )}

          {items.length === 0 ? (
            <div
              className="bistro-card"
              style={{
                position: 'relative',
                background: '#ffffff',
                border: '1px solid #eedfc9',
                borderRadius: '14px',
                padding: '4rem 1.5rem',
                textAlign: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(40, 33, 21, 0.04)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
                }}
              />

              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #faf5ec 0%, #f4ebd9 100%)',
                  border: '1px solid #eedfc9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c5a059"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>

              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: '#282115',
                  fontSize: '1.45rem',
                  margin: '0 0 0.6rem',
                  fontWeight: 600,
                }}
              >
                Your Cart Is Empty
              </h2>

              <p
                style={{
                  color: '#78716c',
                  fontSize: '0.92rem',
                  margin: '0 auto 1.75rem',
                  maxWidth: '440px',
                  lineHeight: 1.6,
                }}
              >
                You have not selected any artisanal dishes yet. Explore our curated menu to begin curating your dining experience.
              </p>

              <Link
                to="/menu"
                className="bistro-button-gold"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}
              >
                <span>Browse Menu</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(340px, 380px)',
                gap: '1.75rem',
                alignItems: 'start',
              }}
            >
              {/* Cart Items List */}
              <section
                className="bistro-card"
                style={{
                  position: 'relative',
                  background: '#ffffff',
                  border: '1px solid #eedfc9',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 3px 12px rgba(40, 33, 21, 0.04)',
                }}
              >
                {/* Top Gold Gradient Accent Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginBottom: '1.25rem',
                    paddingBottom: '0.85rem',
                    borderBottom: '1px solid #f0e7db',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h2
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        color: '#282115',
                        fontSize: '1.3rem',
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      Selected Culinary Items
                    </h2>
                  </div>

                  <span
                    style={{
                      background: '#faf5ec',
                      color: '#8c6736',
                      border: '1px solid #eedfc9',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {items.length} {items.length === 1 ? 'Dish' : 'Dishes'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {items.map((item, index) => {
                    const menuItemId = getMenuItemId(item);
                    const itemName = getItemName(item);
                    const itemPrice = getItemPrice(item);
                    const itemQuantity = getItemQuantity(item);
                    const itemDescription = getItemDescription(item);
                    const itemImage = getItemImage(item);

                    const itemSubtotal = itemPrice * itemQuantity;
                    const isUpdating = updatingItemId === menuItemId;
                    const isRemoving = removingItemId === menuItemId;

                    return (
                      <article
                        key={menuItemId ?? index}
                        style={{
                          display: 'flex',
                          gap: '1.15rem',
                          paddingBottom: '1.25rem',
                          borderBottom:
                            index === items.length - 1
                              ? 'none'
                              : '1px solid #f0e7db',
                          opacity: isRemoving ? 0.55 : 1,
                          transition: 'opacity 0.2s ease',
                          alignItems: 'center',
                        }}
                      >
                        {/* Item Image */}
                        <div
                          style={{
                            width: '92px',
                            height: '92px',
                            flexShrink: 0,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background:
                              'linear-gradient(135deg, #f7f1e7, #ebe2d3)',
                            border: '1px solid #eedfc9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt={itemName}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg
                              width="32"
                              height="32"
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
                          )}
                        </div>

                        {/* Item Details */}
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem',
                          }}
                        >
                          <h3
                            style={{
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                              color: '#282115',
                              fontSize: '1.05rem',
                              margin: 0,
                              fontWeight: 600,
                            }}
                          >
                            {itemName}
                          </h3>

                          <p
                            style={{
                              color: '#78716c',
                              fontSize: '0.82rem',
                              margin: 0,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {itemDescription}
                          </p>

                          <span
                            style={{
                              color: '#8c6736',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                            }}
                          >
                            {formatCurrency(itemPrice)} each
                          </span>

                          {/* Luxury Quantity Controls */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              marginTop: '0.35rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: '#faf5ec',
                                border: '1px solid #e2d1ba',
                                borderRadius: '8px',
                                padding: '2px',
                              }}
                            >
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${itemName}`}
                                disabled={isUpdating || isRemoving}
                                onClick={() => handleDecreaseQuantity(item)}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#ffffff',
                                  color: '#6b4e2e',
                                  cursor: 'pointer',
                                  fontSize: '1.05rem',
                                  fontWeight: 700,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                −
                              </button>

                              <span
                                aria-label={`Quantity: ${itemQuantity}`}
                                style={{
                                  minWidth: '32px',
                                  textAlign: 'center',
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  color: '#282115',
                                }}
                              >
                                {itemQuantity}
                              </span>

                              <button
                                type="button"
                                aria-label={`Increase quantity of ${itemName}`}
                                disabled={isUpdating || isRemoving}
                                onClick={() => handleIncreaseQuantity(item)}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#ffffff',
                                  color: '#6b4e2e',
                                  cursor: 'pointer',
                                  fontSize: '1.05rem',
                                  fontWeight: 700,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={isUpdating || isRemoving}
                              onClick={() => handleRemoveItem(menuItemId)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                marginLeft: '0.4rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Item Subtotal */}
                        <div
                          style={{
                            minWidth: '100px',
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.3rem',
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Subtotal
                          </span>
                          <strong
                            style={{
                              color: '#282115',
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                              fontSize: '1.08rem',
                            }}
                          >
                            {formatCurrency(itemSubtotal)}
                          </strong>

                          {isUpdating && (
                            <span
                              style={{
                                color: '#8c6736',
                                fontSize: '0.72rem',
                                fontStyle: 'italic',
                              }}
                            >
                              Updating…
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Clear Cart Action */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f0e7db',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleClearCart}
                    disabled={clearingCart}
                    style={{
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      background: '#fff5f5',
                      color: '#b91c1c',
                      padding: '0.48rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: clearingCart ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>{clearingCart ? 'Clearing…' : 'Clear All Items'}</span>
                  </button>
                </div>
              </section>

              {/* Order Summary & Dual Checkout Actions */}
              <aside
                className="bistro-card"
                style={{
                  position: 'sticky',
                  top: '1rem',
                  background: '#ffffff',
                  border: '1px solid #eedfc9',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(40, 33, 21, 0.05)',
                }}
              >
                {/* Top Gold Gradient Accent Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
                  }}
                />

                <h2
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: '#282115',
                    fontSize: '1.25rem',
                    margin: '0 0 1.25rem',
                    fontWeight: 600,
                  }}
                >
                  Order Summary
                </h2>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                    color: '#78716c',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>Selected Dishes</span>
                  <span style={{ fontWeight: 600, color: '#282115' }}>{items.length}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '1rem',
                    color: '#78716c',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>Estimated Total</span>
                  <span style={{ fontWeight: 600, color: '#282115' }}>{formatCurrency(total)}</span>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #eedfc9',
                    paddingTop: '1.15rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '1rem',
                  }}
                >
                  <strong
                    style={{
                      color: '#282115',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}
                  >
                    Grand Total
                  </strong>

                  <strong
                    style={{
                      color: '#8c6736',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '1.35rem',
                      fontWeight: 700,
                    }}
                  >
                    {formatCurrency(total)}
                  </strong>
                </div>

                {/* Dual Checkout Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Primary: Dine-In Order */}
                  <Link
                    to="/order-review"
                    className="bistro-button-gold"
                    style={{
                      display: 'flex',
                      width: '100%',
                      boxSizing: 'border-box',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      padding: '0.75rem 1.15rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 18v3" />
                      <path d="M20 18v3" />
                      <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                      <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                    </svg>
                    <span>Dine-In Order Now</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  {/* Secondary: Pre-Order for Reservation */}
                  <Link
                    to="/reservation-pre-order"
                    className="bistro-button-outline"
                    style={{
                      display: 'flex',
                      width: '100%',
                      boxSizing: 'border-box',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      padding: '0.7rem 1.15rem',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      background: '#faf5ec',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>Pre-Order for Booking</span>
                  </Link>
                </div>

                {/* Reassurance note */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: '#78716c',
                    fontSize: '0.78rem',
                    marginTop: '1.25rem',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Fresh artisanal preparation guaranteed</span>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* Responsive Styles */}
      <style>
        {`
          @media (max-width: 850px) {
            .customer-cart-page > div[style*="grid-template-columns"] {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .customer-cart-page aside {
              position: static !important;
            }
          }

          @media (max-width: 520px) {
            .customer-cart-page article {
              flex-direction: column;
              align-items: flex-start !important;
            }

            .customer-cart-page article > div:last-child {
              align-items: flex-start !important;
              text-align: left !important;
              margin-top: 0.5rem;
            }
          }
        `}
      </style>
    </div>
  );
}

export default CustomerCartPage;
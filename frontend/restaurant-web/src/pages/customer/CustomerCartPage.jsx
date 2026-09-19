
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
  if (Array.isArray(cartData)) {
    return cartData;
  }

  if (Array.isArray(cartData?.items)) {
    return cartData.items;
  }

  if (Array.isArray(cartData?.cartItems)) {
    return cartData.cartItems;
  }

  if (Array.isArray(cartData?.orderItems)) {
    return cartData.orderItems;
  }

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
        subtitle="Review your selected dishes and adjust quantities before continuing with your order."
        actions={
          <Link
            to="/menu"
            className="bistro-button-outline"
            style={{ textDecoration: 'none' }}
          >
            Continue Shopping
          </Link>
        }
      />

      {loading && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '12px',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: '#78716c',
          }}
        >
          Loading your cart...
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            color: '#991b1b',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: '0 0 0.75rem' }}>{error}</p>

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
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                color: '#166534',
                fontSize: '0.88rem',
                marginBottom: '1rem',
              }}
            >
              {successMessage}
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              style={{
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                color: '#991b1b',
                fontSize: '0.88rem',
                marginBottom: '1rem',
              }}
            >
              {actionError}
            </div>
          )}

          {items.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #eedfc9',
                borderRadius: '12px',
                padding: '4rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#f5efe6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
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
                  fontSize: '1.4rem',
                  margin: '0 0 0.6rem',
                }}
              >
                Your Cart Is Empty
              </h2>

              <p
                style={{
                  color: '#78716c',
                  fontSize: '0.9rem',
                  margin: '0 auto 1.5rem',
                  maxWidth: '420px',
                  lineHeight: 1.6,
                }}
              >
                You have not added any dishes yet. Explore our menu and choose
                something delicious.
              </p>

              <Link
                to="/menu"
                className="bistro-button-gold"
                style={{ textDecoration: 'none' }}
              >
                Explore Menu
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 320px',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              {/* Cart Items */}
              <section
                style={{
                  background: '#ffffff',
                  border: '1px solid #eedfc9',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      color: '#282115',
                      fontSize: '1.25rem',
                      margin: 0,
                    }}
                  >
                    Selected Items
                  </h2>

                  <span
                    style={{
                      color: '#8c6736',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
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
                          gap: '1rem',
                          paddingBottom: '1rem',
                          borderBottom:
                            index === items.length - 1
                              ? 'none'
                              : '1px solid #f0e7db',
                          opacity: isRemoving ? 0.55 : 1,
                        }}
                      >
                        {/* Item Image */}
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            flexShrink: 0,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background:
                              'linear-gradient(135deg, #f7f1e7, #ebe2d3)',
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
                              width="30"
                              height="30"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#c5a059"
                              strokeWidth="1.5"
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
                            gap: '0.35rem',
                          }}
                        >
                          <h3
                            style={{
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                              color: '#282115',
                              fontSize: '1rem',
                              margin: 0,
                              fontWeight: 600,
                            }}
                          >
                            {itemName}
                          </h3>

                          <p
                            style={{
                              color: '#78716c',
                              fontSize: '0.78rem',
                              margin: 0,
                              lineHeight: 1.4,
                            }}
                          >
                            {itemDescription}
                          </p>

                          <span
                            style={{
                              color: '#8c6736',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(itemPrice)} each
                          </span>

                          {/* Quantity Controls */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.35rem',
                              flexWrap: 'wrap',
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
                                border: '1px solid #d8c7ad',
                                background: '#ffffff',
                                color: '#6b4e2e',
                                cursor: 'pointer',
                                fontSize: '1rem',
                              }}
                            >
                              −
                            </button>

                            <span
                              aria-label={`Quantity: ${itemQuantity}`}
                              style={{
                                minWidth: '28px',
                                textAlign: 'center',
                                fontSize: '0.85rem',
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
                                border: '1px solid #d8c7ad',
                                background: '#ffffff',
                                color: '#6b4e2e',
                                cursor: 'pointer',
                                fontSize: '1rem',
                              }}
                            >
                              +
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating || isRemoving}
                              onClick={() => handleRemoveItem(menuItemId)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#b45309',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                textDecoration: 'underline',
                                marginLeft: '0.25rem',
                              }}
                            >
                              {isRemoving ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>

                        {/* Item Subtotal */}
                        <div
                          style={{
                            minWidth: '95px',
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.4rem',
                          }}
                        >
                          <strong
                            style={{
                              color: '#282115',
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                              fontSize: '0.95rem',
                            }}
                          >
                            {formatCurrency(itemSubtotal)}
                          </strong>

                          {isUpdating && (
                            <span
                              style={{
                                color: '#8c6736',
                                fontSize: '0.7rem',
                              }}
                            >
                              Updating...
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Clear Cart */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f0e7db',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleClearCart}
                    disabled={clearingCart}
                    style={{
                      border: '1px solid #e5caca',
                      borderRadius: '7px',
                      background: '#fffafa',
                      color: '#b91c1c',
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.78rem',
                      cursor: clearingCart ? 'wait' : 'pointer',
                    }}
                  >
                    {clearingCart ? 'Clearing...' : 'Clear Cart'}
                  </button>
                </div>
              </section>

              {/* Cart Summary */}
              <aside
                style={{
                  background: '#ffffff',
                  border: '1px solid #eedfc9',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  position: 'sticky',
                  top: '1rem',
                }}
              >
                <h2
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: '#282115',
                    fontSize: '1.25rem',
                    margin: '0 0 1.25rem',
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
                    fontSize: '0.85rem',
                  }}
                >
                  <span>Items</span>
                  <span>{items.length}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '1rem',
                    color: '#78716c',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #eedfc9',
                    paddingTop: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <strong
                    style={{
                      color: '#282115',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '1rem',
                    }}
                  >
                    Total
                  </strong>

                  <strong
                    style={{
                      color: '#8c6736',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '1.15rem',
                    }}
                  >
                    {formatCurrency(total)}
                  </strong>
                </div>

                <Link
                  to="/order-review"
                  className="bistro-button-gold"
                  style={{
                    display: 'flex',
                    width: '100%',
                    boxSizing: 'border-box',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Continue to Order <span aria-hidden="true">→</span>
                </Link>

                <Link
                  to="/menu"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    marginTop: '1rem',
                    color: '#8c6736',
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                  }}
                >
                  Continue browsing menu
                </Link>
              </aside>
            </div>
          )}
        </>
      )}

      {/* Responsive Layout Adjustment */}
      <style>
        {`
          @media (max-width: 850px) {
            .customer-cart-page > div > div {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .customer-cart-page aside {
              position: static !important;
            }
          }

          @media (max-width: 480px) {
            .customer-cart-page article {
              flex-wrap: wrap;
            }

            .customer-cart-page article > div:last-child {
              margin-left: auto;
            }
          }
        `}
      </style>
    </div>
  );
}

export default CustomerCartPage;
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getCart, clearCart } from '../../services/cartService';
import { getActiveTables } from '../../services/tableService';
import { submitDineInOrder } from '../../services/orderService';

const getCartItems = (cartData) => {
  if (Array.isArray(cartData)) return cartData;
  if (Array.isArray(cartData?.items)) return cartData.items;
  if (Array.isArray(cartData?.cartItems)) return cartData.cartItems;
  if (Array.isArray(cartData?.orderItems)) return cartData.orderItems;
  return [];
};

const getMenuItemId = (item) =>
  item.menuItemId ??
  item.MenuItemId ??
  item.menuItem?.menuItemId ??
  item.menuItem?.MenuItemId;

const getItemName = (item) =>
  item.itemName ??
  item.ItemName ??
  item.menuItem?.itemName ??
  item.menuItem?.ItemName ??
  'Menu Item';

const getItemPrice = (item) =>
  Number(
    item.unitPrice ??
      item.UnitPrice ??
      item.price ??
      item.Price ??
      item.menuItem?.price ??
      item.menuItem?.Price ??
      0
  ) || 0;

const getItemQuantity = (item) =>
  Number(item.quantity ?? item.Quantity ?? 1) || 1;

const getTableId = (table) =>
  table.tableId ??
  table.TableId ??
  table.id ??
  table.Id;

const getTableNumber = (table) =>
  table.tableNumber ??
  table.TableNumber ??
  table.name ??
  table.Name ??
  getTableId(table);

const getTableCapacity = (table) =>
  table.capacity ??
  table.Capacity ??
  'Not specified';

const getTableLocation = (table) =>
  table.location ??
  table.Location ??
  'Main Dining Floor';

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function OrderReviewPage() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const items = useMemo(() => getCartItems(cart), [cart]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getItemPrice(item) * getItemQuantity(item),
        0
      ),
    [items]
  );

  useEffect(() => {
    const loadReviewData = async () => {
      try {
        setLoading(true);
        setError('');

        const [cartData, tableData] = await Promise.all([
          getCart(),
          getActiveTables(),
        ]);

        setCart(cartData);
        setTables(Array.isArray(tableData) ? tableData : []);
      } catch (err) {
        console.error('Unable to load order review data:', err);

        setError(
          err.response?.data?.message ||
            'Unable to load your order review information.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviewData();
  }, []);

  const selectedTable = useMemo(() => {
    return tables.find((t) => String(getTableId(t)) === String(selectedTableId));
  }, [tables, selectedTableId]);

  const handleSubmit = async () => {
    setError('');

    if (items.length === 0) {
      setError('Your cart is empty. Add food items before continuing.');
      return;
    }

    if (!selectedTableId) {
      setError('Please select a restaurant table before submitting.');
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !getMenuItemId(item) ||
        getItemQuantity(item) <= 0 ||
        !Number.isInteger(getItemQuantity(item))
    );

    if (invalidItem) {
      setError('One or more cart items are invalid. Please update your cart.');
      return;
    }

    const request = {
      tableId: Number(selectedTableId),
      orderType: 'DineIn',
      items: items.map((item) => ({
        menuItemId: Number(getMenuItemId(item)),
        quantity: getItemQuantity(item),
      })),
    };

    try {
      setSubmitting(true);

      const response = await submitDineInOrder(request);

      setSuccess(response);

      try {
        await clearCart();
      } catch (clearError) {
        console.warn('Order succeeded, but cart clearing failed:', clearError);
      }
    } catch (err) {
      console.error('Dine-in order submission failed:', err);

      const status = err.response?.status;

      if (status === 400) {
        setError(
          err.response?.data?.message ||
            'The order information is invalid. Please review your cart and table.'
        );
      } else if (status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (status === 403) {
        setError('You are not authorized to submit this order.');
      } else if (status === 404) {
        setError('The order service or selected table could not be found.');
      } else if (status === 409) {
        setError('This order conflicts with the current table or menu availability.');
      } else {
        setError('The order service is currently unavailable. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Dining Room Service"
          title={<>Confirm Dine-In <em>Order</em></>}
          subtitle="Preparing your culinary selection and seating roster."
        />
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
            Preparing your order details…
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    const orderReference =
      success.orderReference ??
      success.OrderReference ??
      success.reference ??
      success.Reference ??
      `ORD-${success.orderId || success.OrderId || 'CONFIRMED'}`;

    const orderStatus =
      success.status ??
      success.Status ??
      'Pending';

    return (
      <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Cinnamon Bistro Kitchen"
          title={<>Dine-In Order <em>Confirmed</em></>}
          subtitle="Your artisanal order has been transmitted directly to our culinary kitchen."
        />

        <section
          className="bistro-card"
          style={{
            position: 'relative',
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(40, 33, 21, 0.07)',
          }}
        >
          {/* Top Gold Gradient Accent Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            }}
          />

          {/* Celebratory Emerald Badge */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#15803d',
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.12)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '1.65rem',
              color: '#282115',
              margin: '0 0 0.5rem',
              fontWeight: 600,
            }}
          >
            Your Order Has Been Accepted
          </h2>

          <p style={{ color: '#78716c', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.94rem' }}>
            Your culinary selection has been dispatched to the kitchen. Our culinary specialists are preparing your dishes with care.
          </p>

          {/* Monospace Reference Highlight Box */}
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#faf6ee',
              border: '1px solid #ebdcc5',
              borderRadius: '12px',
              padding: '0.85rem 2rem',
              marginBottom: '2rem',
            }}
          >
            <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8c6736', fontWeight: 700, marginBottom: '0.2rem' }}>
              Order Reference
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: '#282115', letterSpacing: '0.08em' }}>
              #{orderReference}
            </span>
          </div>

          {/* Structured Order Recap Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              maxWidth: '560px',
              margin: '0 auto 2.25rem',
              textAlign: 'left',
            }}
          >
            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Seated Table
              </span>
              <strong style={{ fontFamily: "Georgia, serif", fontSize: '1.05rem', color: '#282115' }}>
                Table {selectedTable ? getTableNumber(selectedTable) : 'Reserved'}
              </strong>
            </div>

            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Total Amount
              </span>
              <strong style={{ fontFamily: "Georgia, serif", fontSize: '1.05rem', color: '#8c6736' }}>
                {formatCurrency(total)}
              </strong>
            </div>

            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Kitchen Status
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  marginTop: '0.2rem',
                }}
              >
                <span className="profile-avatar-pulse-dot" style={{ width: '6px', height: '6px', background: '#d97706' }} />
                {orderStatus}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/portal"
              className="bistro-button-gold"
              style={{ textDecoration: 'none', padding: '0.65rem 1.4rem' }}
            >
              Return to Portal
            </Link>
            <Link
              to="/menu"
              className="bistro-button-outline"
              style={{ textDecoration: 'none', padding: '0.65rem 1.4rem' }}
            >
              Explore More Dishes
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
      }}
    >
      <PageHeader
        eyebrow="Dining Room Service"
        title={
          <>
            Review Your <em>Order</em>
          </>
        }
        subtitle="Select your restaurant table and confirm your artisanal dining order for the kitchen."
        actions={
          <Link
            to="/cart"
            className="bistro-button-outline"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <span>← Back to Cart</span>
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '10px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="bistro-card"
          style={{
            position: 'relative',
            padding: '4rem 1.5rem',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '14px',
            border: '1px solid #eedfc9',
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
          <h2 style={{ fontFamily: "Georgia, serif", color: '#282115', margin: '0 0 0.5rem' }}>
            Your Cart Is Empty
          </h2>
          <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>
            Please select culinary items from our menu before reviewing your order.
          </p>
          <Link
            to="/menu"
            className="bistro-button-gold"
            style={{ textDecoration: 'none', display: 'inline-flex', padding: '0.65rem 1.35rem' }}
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 400px)',
            gap: '1.75rem',
            alignItems: 'start',
          }}
        >
          {/* Order Items Review */}
          <section
            className="bistro-card"
            style={{
              position: 'relative',
              background: '#fff',
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
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid #f0e7db',
                marginBottom: '1.25rem',
              }}
            >
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: '#282115',
                  fontSize: '1.25rem',
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Selected Culinary Dishes
              </h2>

              <span
                style={{
                  background: '#faf5ec',
                  color: '#8c6736',
                  border: '1px solid #eedfc9',
                  borderRadius: '9999px',
                  padding: '0.15rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
              >
                {items.length} {items.length === 1 ? 'Dish' : 'Dishes'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, index) => {
                const price = getItemPrice(item);
                const quantity = getItemQuantity(item);
                const subtotal = price * quantity;

                return (
                  <article
                    key={`${getMenuItemId(item) || 'item'}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem 0',
                      borderBottom:
                        index === items.length - 1
                          ? 'none'
                          : '1px solid #f0e7db',
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontFamily: "Georgia, serif",
                          color: '#282115',
                          fontSize: '1rem',
                        }}
                      >
                        {getItemName(item)}
                      </strong>
                      <div
                        style={{
                          margin: '0.25rem 0 0',
                          color: '#78716c',
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>Qty: {quantity}</span>
                        <span>·</span>
                        <span>{formatCurrency(price)} each</span>
                      </div>
                    </div>

                    <strong
                      style={{
                        fontFamily: "Georgia, serif",
                        color: '#282115',
                        fontSize: '1.05rem',
                      }}
                    >
                      {formatCurrency(subtotal)}
                    </strong>
                  </article>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '1.25rem',
                paddingTop: '1.15rem',
                borderTop: '2px solid #eedfc9',
              }}
            >
              <strong
                style={{
                  color: '#282115',
                  fontFamily: "Georgia, serif",
                  fontSize: '1.1rem',
                }}
              >
                Order Total
              </strong>
              <strong
                style={{
                  color: '#8c6736',
                  fontFamily: "Georgia, serif",
                  fontSize: '1.35rem',
                  fontWeight: 700,
                }}
              >
                {formatCurrency(total)}
              </strong>
            </div>
          </section>

          {/* Table Selection Aside */}
          <aside
            className="bistro-card"
            style={{
              position: 'sticky',
              top: '1rem',
              background: '#fff',
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
                margin: '0 0 0.45rem',
                fontWeight: 600,
              }}
            >
              Select Your Table
            </h2>
            <p style={{ color: '#78716c', fontSize: '0.84rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Choose the restaurant table where you are seated.
            </p>

            {tables.length === 0 ? (
              <p style={{ color: '#78716c', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No active restaurant tables currently available.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                  gap: '0.65rem',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '2px',
                  marginBottom: '1.25rem',
                }}
              >
                {tables.map((table, index) => {
                  const id = getTableId(table);
                  const isSelected = String(selectedTableId) === String(id);

                  return (
                    <button
                      key={String(id || index)}
                      type="button"
                      onClick={() => setSelectedTableId(id)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #c5a059'
                          : '1px solid #eedfc9',
                        background: isSelected ? '#faf4e8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected
                          ? '0 2px 8px rgba(197, 160, 89, 0.25)'
                          : '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isSelected ? '#ecd6aa' : '#faf5ec',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.35rem',
                          color: '#8c6736',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18v3" />
                          <path d="M20 18v3" />
                          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                          <path d="M2 11h20v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#282115',
                        }}
                      >
                        Table {getTableNumber(table)}
                      </div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: '#78716c',
                          marginTop: '0.2rem',
                        }}
                      >
                        {getTableCapacity(table)} seats
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTable && (
              <div
                style={{
                  background: '#faf6ee',
                  border: '1px solid #eedfc9',
                  borderRadius: '10px',
                  padding: '0.75rem 0.95rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #eedfc9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c5a059',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selected Seating
                  </div>
                  <strong style={{ fontFamily: 'Georgia, serif', color: '#282115', fontSize: '0.94rem' }}>
                    Table {getTableNumber(selectedTable)} · {getTableLocation(selectedTable)}
                  </strong>
                </div>
              </div>
            )}

            <button
              type="button"
              className="bistro-button-gold"
              onClick={handleSubmit}
              disabled={submitting || items.length === 0 || !selectedTableId}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                opacity: submitting || items.length === 0 || !selectedTableId ? 0.6 : 1,
                cursor: submitting || items.length === 0 || !selectedTableId ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting Order to Kitchen…' : 'Confirm & Place Dine-In Order →'}
            </button>

            <p
              style={{
                color: '#78716c',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                textAlign: 'center',
                margin: '0.85rem 0 0',
              }}
            >
              Your order will be instantly transmitted to the kitchen queue.
            </p>
          </aside>
        </div>
      )}

      <style>
        {`
          @media (max-width: 850px) {
            .page-container > div[style*="grid-template-columns"] {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .page-container aside {
              position: static !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default OrderReviewPage;

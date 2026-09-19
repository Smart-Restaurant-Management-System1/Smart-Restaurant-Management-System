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
      tableId: selectedTableId,
      orderType: 'DineIn',
      items: items.map((item) => ({
        menuItemId: getMenuItemId(item),
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
        setError(
          'The order service or selected table could not be found.'
        );
      } else if (status === 409) {
        setError(
          'This order conflicts with the current table or menu availability.'
        );
      } else {
        setError(
          'The order service is currently unavailable. Please try again later.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          eyebrow="Cinnamon Bistro"
          title="Order Review"
          subtitle="Preparing your order review."
        />
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
          }}
        >
          Loading your order...
        </div>
      </div>
    );
  }

  if (success) {
    const orderReference =
      success.orderReference ??
      success.OrderReference ??
      success.reference ??
      success.Reference;

    const orderStatus =
      success.status ??
      success.Status ??
      'Pending';

    return (
      <div className="page-container">
        <PageHeader
          eyebrow="Cinnamon Bistro"
          title="Order Confirmed"
          subtitle="Your dine-in order has been submitted successfully."
        />

        <section
          style={{
            maxWidth: '650px',
            margin: '0 auto',
            padding: '2rem',
            background: '#fff',
            border: '1px solid #eadcc9',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            ✓
          </div>

          <h2 style={{ marginBottom: '0.75rem' }}>
            Your order has been accepted
          </h2>

          <p style={{ color: '#78716c', lineHeight: 1.6 }}>
            Your order has been received and will continue through the
            restaurant kitchen workflow.
          </p>

          {orderReference && (
            <p>
              <strong>Order Reference:</strong> {orderReference}
            </p>
          )}

          <p>
            <strong>Status:</strong> {orderStatus}
          </p>

          <Link
            to="/portal"
            className="bistro-button-gold"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              textDecoration: 'none',
            }}
          >
            Return to Portal
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <PageHeader
        eyebrow="Your Dining Selection"
        title={
          <>
            Review Your <em>Order</em>
          </>
        }
        subtitle="Review your food items, select a restaurant table, and confirm your dine-in order."
        actions={
          <Link
            to="/cart"
            className="bistro-button-outline"
            style={{ textDecoration: 'none' }}
          >
            Back to Cart
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            marginBottom: '1.25rem',
            borderRadius: '10px',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#9f1239',
          }}
        >
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <section
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
          }}
        >
          <h2>Your cart is empty</h2>
          <p>Add food items before reviewing your order.</p>

          <Link
            to="/menu"
            className="bistro-button-gold"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              textDecoration: 'none',
            }}
          >
            Browse Menu
          </Link>
        </section>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          <section
            style={{
              background: '#fff',
              border: '1px solid #eadcc9',
              borderRadius: '14px',
              padding: '1.25rem',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Selected Food Items</h2>

            {items.map((item, index) => {
              const price = getItemPrice(item);
              const quantity = getItemQuantity(item);

              return (
                <article
                  key={`${getMenuItemId(item) || 'item'}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem 0',
                    borderBottom:
                      index === items.length - 1
                        ? 'none'
                        : '1px solid #f0e7db',
                  }}
                >
                  <div>
                    <strong>{getItemName(item)}</strong>
                    <p
                      style={{
                        margin: '0.35rem 0 0',
                        color: '#78716c',
                        fontSize: '0.9rem',
                      }}
                    >
                      Quantity: {quantity}
                    </p>
                  </div>

                  <strong>
                    {formatCurrency(price * quantity)}
                  </strong>
                </article>
              );
            })}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '2px solid #eadcc9',
                fontSize: '1.1rem',
              }}
            >
              <strong>Displayed Total</strong>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <p
              style={{
                color: '#78716c',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                marginBottom: 0,
              }}
            >
              Final prices and totals must be validated by the backend.
            </p>
          </section>

          <aside
            style={{
              background: '#fff',
              border: '1px solid #eadcc9',
              borderRadius: '14px',
              padding: '1.25rem',
              position: 'sticky',
              top: '1rem',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Select Your Table</h2>

            {tables.length === 0 ? (
              <p style={{ color: '#78716c' }}>
                No active restaurant tables were found.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.75rem',
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
                        padding: '1rem 0.5rem',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #9a6b35'
                          : '1px solid #eadcc9',
                        background: isSelected ? '#fff1dc' : '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Table {getTableNumber(table)}
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          marginTop: '0.35rem',
                        }}
                      >
                        Capacity: {getTableCapacity(table)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className="bistro-button-gold"
              onClick={handleSubmit}
              disabled={submitting || items.length === 0 || !selectedTableId}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                opacity:
                  submitting || items.length === 0 || !selectedTableId
                    ? 0.6
                    : 1,
                cursor:
                  submitting || items.length === 0 || !selectedTableId
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {submitting
                ? 'Submitting Order...'
                : 'Confirm Dine-in Order'}
            </button>

            <p
              style={{
                color: '#78716c',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                textAlign: 'center',
                marginBottom: 0,
              }}
            >
              Your order will be submitted for kitchen processing.
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

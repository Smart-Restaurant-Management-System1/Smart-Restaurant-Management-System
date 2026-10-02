import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getApiErrorMessage } from '../../services/apiErrorMessage';
import { getCart, clearCart } from '../../services/cartService';
import { getActiveTables } from '../../services/tableService';
import { submitDineInOrder, getMyOrders } from '../../services/orderService';

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

        const savedOrderReference = sessionStorage.getItem(
          'lastDineInOrderReference'
        );

        const [cartData, tableData] = await Promise.all([
          getCart(),
          getActiveTables(),
        ]);

        setCart(cartData);
        setTables(Array.isArray(tableData) ? tableData : []);

        if (savedOrderReference) {
          const ordersResponse = await getMyOrders({
            page: 1,
            pageSize: 50,
          });

          const orders = Array.isArray(ordersResponse?.orders)
            ? ordersResponse.orders
            : [];

          const savedOrder = orders.find(
            (order) =>
              order.orderReference === savedOrderReference ||
              order.OrderReference === savedOrderReference
          );

          if (savedOrder) {
            setSuccess(savedOrder);

            const savedTableId =
              savedOrder.tableId ?? savedOrder.TableId;

            if (savedTableId) {
              setSelectedTableId(String(savedTableId));
            }
          } else {
            sessionStorage.removeItem('lastDineInOrderReference');
          }
        }
      } catch (err) {
        console.error('Unable to load order review data:', err);

        setError(
          getApiErrorMessage(
            err,
            'Unable to load your order review information.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviewData();
  }, []);

  const selectedTable = useMemo(() => {
    return tables.find(
      (t) => String(getTableId(t)) === String(selectedTableId)
    );
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

      const orderReference =
        response.orderReference ??
        response.OrderReference;

      if (orderReference) {
        sessionStorage.setItem(
          'lastDineInOrderReference',
          orderReference
        );
      }

      setSuccess(response);

      try {
        await clearCart();
      } catch (clearError) {
        console.warn(
          'Order succeeded, but cart clearing failed:',
          clearError
        );
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
      <div
        className="page-container"
        style={{ maxWidth: '1240px', margin: '0 auto' }}
      >
        <PageHeader
          eyebrow="Dining Room Service"
          title={
            <>
              Confirm Dine-In <em>Order</em>
            </>
          }
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
              background:
                'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
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

          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              fontStyle: 'italic',
            }}
          >
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

    const savedTableId =
      success.tableId ??
      success.TableId;

    const displayTable =
      selectedTable ||
      tables.find(
        (table) => String(getTableId(table)) === String(savedTableId)
      );

    const orderItems = Array.isArray(success.items)
      ? success.items
      : Array.isArray(success.Items)
        ? success.Items
        : [];

    const orderTotal =
      success.totalAmount ??
      success.TotalAmount ??
      total;

    return (
      <div
        className="page-container"
        style={{ maxWidth: '820px', margin: '0 auto' }}
      >
        <PageHeader
          eyebrow="Cinnamon Bistro Kitchen"
          title={
            <>
              Dine-In Order <em>Confirmed</em>
            </>
          }
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
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background:
                'linear-gradient(90deg, #c5a059 0%, #ecd6aa 50%, #c5a059 100%)',
            }}
          />

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
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

          <p
            style={{
              color: '#78716c',
              maxWidth: '480px',
              margin: '0 auto 1.75rem',
              lineHeight: 1.6,
              fontSize: '0.94rem',
            }}
          >
            Your culinary selection has been dispatched to the kitchen.
            Our culinary specialists are preparing your dishes with care.
          </p>

          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#faf5ec',
              border: '1px solid #eedfc9',
              borderRadius: '12px',
              padding: '0.85rem 2rem',
              marginBottom: '2rem',
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#8c6736',
                fontWeight: 700,
                marginBottom: '0.2rem',
              }}
            >
              Order Reference
            </span>

            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#282115',
                letterSpacing: '0.08em',
              }}
            >
              #{orderReference}
            </span>
          </div>

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
            <div
              style={{
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  color: '#78716c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                Seated Table
              </span>

              <strong
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.05rem',
                  color: '#282115',
                }}
              >
                Table {displayTable ? getTableNumber(displayTable) : savedTableId || 'Reserved'}
              </strong>
            </div>

            <div
              style={{
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  color: '#78716c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                Total Amount
              </span>

              <strong
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.05rem',
                  color: '#8c6736',
                }}
              >
                {formatCurrency(orderTotal)}
              </strong>
            </div>

            <div
              style={{
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  color: '#78716c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
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
                <span
                  className="profile-avatar-pulse-dot"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: '#d97706',
                  }}
                />

                {orderStatus}
              </span>
            </div>
          </div>

          {orderItems.length > 0 && (
            <div
              style={{
                maxWidth: '560px',
                margin: '0 auto 2rem',
                textAlign: 'left',
              }}
            >
              <h3
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: '#282115',
                  marginBottom: '0.8rem',
                }}
              >
                Order Items
              </h3>

              <div
                style={{
                  border: '1px solid #eedfc9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {orderItems.map((item, index) => {
                  const itemName =
                    item.itemName ??
                    item.ItemName ??
                    'Menu Item';

                  const quantity =
                    item.quantity ??
                    item.Quantity ??
                    1;

                  const subtotal =
                    item.subtotal ??
                    item.Subtotal ??
                    0;

                  return (
                    <div
                      key={
                        item.orderItemId ??
                        item.OrderItemId ??
                        `${itemName}-${index}`
                      }
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderBottom:
                          index < orderItems.length - 1
                            ? '1px solid #eedfc9'
                            : 'none',
                      }}
                    >
                      <span style={{ color: '#44403c' }}>
                        {quantity} × {itemName}
                      </span>

                      <strong style={{ color: '#8c6736' }}>
                        {formatCurrency(subtotal)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/portal"
              className="bistro-button-gold"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 1.4rem',
              }}
            >
              Return to Portal
            </Link>

            <Link
              to="/menu"
              className="bistro-button-outline"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 1.4rem',
              }}
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
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            Back to Cart
          </Link>
        }
      />

      {error && (
        <div
          className="bistro-card"
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      <div className="bistro-dual-pane-grid">
        <section
          className="bistro-card"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '14px',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              marginTop: 0,
              color: '#282115',
            }}
          >
            Your Selection
          </h2>

          {items.length === 0 ? (
            <p style={{ color: '#78716c' }}>
              Your cart is empty.
            </p>
          ) : (
            <div>
              {items.map((item, index) => (
                <div
                  key={getMenuItemId(item) ?? index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.9rem 0',
                    borderBottom: '1px solid #f0e7db',
                  }}
                >
                  <div>
                    <strong style={{ color: '#282115' }}>
                      {getItemName(item)}
                    </strong>

                    <div
                      style={{
                        color: '#78716c',
                        fontSize: '0.88rem',
                        marginTop: '0.2rem',
                      }}
                    >
                      Quantity: {getItemQuantity(item)}
                    </div>
                  </div>

                  <strong style={{ color: '#8c6736' }}>
                    {formatCurrency(
                      getItemPrice(item) * getItemQuantity(item)
                    )}
                  </strong>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              fontSize: '1.05rem',
            }}
          >
            <strong>Total</strong>
            <strong style={{ color: '#8c6736' }}>
              {formatCurrency(total)}
            </strong>
          </div>
        </section>

        <section
          className="bistro-card"
          style={{
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '14px',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              marginTop: 0,
              color: '#282115',
            }}
          >
            Select Table
          </h2>

          {tables.length === 0 ? (
            <p style={{ color: '#78716c' }}>
              No active restaurant tables are currently available.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {tables.map((table) => {
                const tableId = getTableId(table);
                const selected =
                  String(tableId) === String(selectedTableId);

                return (
                  <button
                    key={tableId}
                    type="button"
                    onClick={() =>
                      setSelectedTableId(String(tableId))
                    }
                    style={{
                      textAlign: 'left',
                      border: selected
                        ? '2px solid #c5a059'
                        : '1px solid #eedfc9',
                      background: selected
                        ? '#faf5ec'
                        : '#ffffff',
                      borderRadius: '10px',
                      padding: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        color: '#282115',
                      }}
                    >
                      Table {getTableNumber(table)}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        color: '#78716c',
                        fontSize: '0.84rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      Capacity: {getTableCapacity(table)}
                    </span>

                    <span
                      style={{
                        display: 'block',
                        color: '#78716c',
                        fontSize: '0.84rem',
                      }}
                    >
                      Location: {getTableLocation(table)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              items.length === 0 ||
              !selectedTableId
            }
            className="bistro-button-gold"
            style={{
              width: '100%',
              marginTop: '1.25rem',
              padding: '0.8rem 1rem',
              border: 'none',
              cursor:
                submitting ||
                items.length === 0 ||
                !selectedTableId
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                submitting ||
                items.length === 0 ||
                !selectedTableId
                  ? 0.6
                  : 1,
            }}
          >
            {submitting
              ? 'Submitting Order...'
              : 'Confirm & Submit Order'}
          </button>
        </section>
      </div>
    </div>
  );
}

export default OrderReviewPage;
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getCart, clearCart } from '../../services/cartService';
import { getMyReservationHistory } from '../../services/tableService';
import { submitReservationPreOrder } from '../../services/orderService';

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

const getReservationId = (reservation) =>
  reservation.id ??
  reservation.Id ??
  reservation.reservationId ??
  reservation.ReservationId;

const getReservationStatus = (reservation) =>
  reservation.status ?? reservation.Status ?? 'Unknown';

const getReservationDate = (reservation) =>
  reservation.startDateTime ??
  reservation.StartDateTime ??
  reservation.reservationDate ??
  reservation.ReservationDate ??
  '';

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const getReservationList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function ReservationPreOrderPage() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const items = useMemo(() => getCartItems(cart), [cart]);

  const displayedTotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + getItemPrice(item) * getItemQuantity(item),
        0
      ),
    [items]
  );

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true);
        setError('');

        const [cartData, reservationData] = await Promise.all([
          getCart(),
          getMyReservationHistory(),
        ]);

        setCart(cartData);
        setReservations(getReservationList(reservationData));
      } catch (err) {
        console.error('Unable to load reservation pre-order data:', err);

        setError(
          err.response?.data?.message ||
            'Unable to load your cart and reservations.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, []);

  const handleSubmit = async () => {
    if (submitting || success) return;

    setError('');

    if (!selectedReservationId) {
      setError('Please select a reservation before submitting.');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty. Add menu items before submitting.');
      return;
    }

    const invalidItem = items.find((item) => {
      const menuItemId = getMenuItemId(item);
      const quantity = getItemQuantity(item);

      return !menuItemId || quantity < 1 || quantity > 99;
    });

    if (invalidItem) {
      setError('Your cart contains an invalid menu item or quantity.');
      return;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    try {
      setSubmitting(true);

      const response = await submitReservationPreOrder(
        Number(selectedReservationId),
        items.map((item) => ({
          menuItemId: Number(getMenuItemId(item)),
          quantity: getItemQuantity(item),
        })),
        idempotencyKey
      );

      setSuccess(response);

      try {
        await clearCart();
        setCart({ items: [] });
      } catch (clearError) {
        console.warn('Pre-order succeeded, but cart clearing failed:', clearError);
      }
    } catch (err) {
      console.error('Reservation pre-order submission failed:', err);

      const status = err.response?.status;

      if (status === 400) {
        setError(
          err.response?.data?.message ||
            'Please check your selected reservation and cart items.'
        );
      } else if (status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (status === 403) {
        setError('You are not allowed to submit this pre-order.');
      } else if (status === 404) {
        setError('The reservation or menu item could not be found.');
      } else if (status === 409) {
        setError(
          err.response?.data?.message ||
            'This reservation is no longer eligible for a pre-order.'
        );
      } else {
        setError(
          'Unable to submit the pre-order right now. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Reservation Pre-Order"
          subtitle="Loading your cart and reservations..."
        />
        <p>Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <PageHeader
          title="Pre-Order Submitted"
          subtitle="Your reservation-linked pre-order was accepted."
        />

        <section
          style={{
            maxWidth: 700,
            padding: 24,
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
          }}
        >
          <h2>Order confirmed for processing</h2>

          <p>
            Your pre-order has been created successfully and is currently
            pending.
          </p>

          <p>
            <strong>Order reference:</strong>{' '}
            {success.orderReference || success.OrderReference || 'Unavailable'}
          </p>

          <p>
            <strong>Reservation ID:</strong>{' '}
            {success.reservationId || success.ReservationId}
          </p>

          <p>
            <strong>Status:</strong>{' '}
            {success.status || success.Status || 'Pending'}
          </p>

          <p>
            <strong>Total:</strong>{' '}
            {formatCurrency(success.totalAmount || success.TotalAmount)}
          </p>

          <button
            type="button"
            onClick={() => navigate('/portal')}
            style={{
              padding: '12px 18px',
              border: 0,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Return to Portal
          </button>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reservation Pre-Order"
        subtitle="Review your cart and link it to an upcoming reservation."
      />

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 8,
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2>Select Reservation</h2>

        {reservations.length === 0 ? (
          <p>
            No reservations were found. Create a reservation before placing
            a pre-order.
          </p>
        ) : (
          <select
            value={selectedReservationId}
            onChange={(event) =>
              setSelectedReservationId(event.target.value)
            }
            disabled={submitting}
            style={{
              width: '100%',
              maxWidth: 600,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <option value="">Choose a reservation</option>

            {reservations.map((reservation) => {
              const id = getReservationId(reservation);
              const status = getReservationStatus(reservation);
              const date = getReservationDate(reservation);

              return (
                <option key={id} value={id}>
                  Reservation #{id} — {formatDate(date)} — {status}
                </option>
              );
            })}
          </select>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2>Cart Review</h2>

        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            {items.map((item, index) => {
              const quantity = getItemQuantity(item);
              const price = getItemPrice(item);

              return (
                <article
                  key={`${getMenuItemId(item)}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <div>
                    <strong>{getItemName(item)}</strong>
                    <p>
                      Quantity: {quantity} × {formatCurrency(price)}
                    </p>
                  </div>

                  <strong>{formatCurrency(price * quantity)}</strong>
                </article>
              );
            })}

            <h3 style={{ marginTop: 20 }}>
              Displayed total: {formatCurrency(displayedTotal)}
            </h3>

            <p>
              Final prices and totals will be revalidated by the backend
              during submission.
            </p>
          </>
        )}
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          submitting ||
          items.length === 0 ||
          reservations.length === 0 ||
          !selectedReservationId
        }
        style={{
          padding: '12px 20px',
          border: 0,
          borderRadius: 8,
          cursor: submitting ? 'wait' : 'pointer',
        }}
      >
        {submitting ? 'Submitting Pre-Order...' : 'Confirm Reservation Pre-Order'}
      </button>
    </div>
  );
}

export default ReservationPreOrderPage;

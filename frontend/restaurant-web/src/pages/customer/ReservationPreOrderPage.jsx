import React, { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../services/apiErrorMessage';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  reservation.reservationId ??
  reservation.ReservationId ??
  reservation.id ??
  reservation.Id;

const getReservationReference = (reservation) =>
  reservation.bookingReference ??
  reservation.BookingReference ??
  reservation.reference ??
  reservation.Reference ??
  `RES-${getReservationId(reservation)}`;

const getReservationTableNumber = (reservation) =>
  reservation.tableNumber ??
  reservation.TableNumber ??
  reservation.table?.tableNumber ??
  reservation.table?.TableNumber ??
  'Assigned';

const getReservationGuestCount = (reservation) =>
  reservation.guestCount ??
  reservation.GuestCount ??
  reservation.guests ??
  reservation.Guests ??
  '—';

const getReservationStatus = (reservation) =>
  reservation.status ?? reservation.Status ?? 'Confirmed';

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

const formatDateTime = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [searchParams] = useSearchParams();
  const queryReservationId = searchParams.get('reservationId');

  const [cart, setCart] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [selectedReservationId, setSelectedReservationId] = useState(queryReservationId || '');
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

        const resList = getReservationList(reservationData);
        setCart(cartData);
        setReservations(resList);

        if (queryReservationId) {
          const match = resList.find(
            (r) => String(getReservationId(r)) === String(queryReservationId)
          );
          if (match) {
            setSelectedReservationId(String(getReservationId(match)));
          }
        } else if (resList.length === 1 && !selectedReservationId) {
          setSelectedReservationId(String(getReservationId(resList[0])));
        }
      } catch (err) {
        console.error('Unable to load reservation pre-order data:', err);
        setError(
          getApiErrorMessage(err, 'Unable to load your cart and reservations. Please try again.')
        );
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [queryReservationId]);

  const selectedReservation = useMemo(() => {
    if (!selectedReservationId) return null;
    return reservations.find(
      (r) => String(getReservationId(r)) === String(selectedReservationId)
    );
  }, [reservations, selectedReservationId]);

  const handleSubmit = async () => {
    if (submitting || success) return;

    setError('');

    if (!selectedReservationId) {
      setError('Please select an upcoming reservation before confirming your pre-order.');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty. Please add menu items before submitting.');
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
            'Please verify your selected reservation and cart items.'
        );
      } else if (status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else if (status === 403) {
        setError('You are not authorized to submit this reservation pre-order.');
      } else if (status === 404) {
        setError('The reservation or menu items could not be found.');
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
      <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Table Reservation"
          title={<>Reservation <em>Pre-Order</em></>}
          subtitle="Preparing your reservation details and cart selections."
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
            Loading your reservation details and cart…
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
      `PRE-${success.orderId || success.OrderId || selectedReservationId || 'ACCEPTED'}`;

    const orderStatus =
      success.status ??
      success.Status ??
      'Pending';

    return (
      <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="Bespoke Dining Prep"
          title={<>Pre-Order <em>Confirmed</em></>}
          subtitle="Your pre-order has been tied to your reservation and sent to the culinary team."
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
            Pre-Order Confirmed for Arrival
          </h2>

          <p style={{ color: '#78716c', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.94rem' }}>
            Your selected dishes will be curated to coordinate with your reservation visit. We look forward to welcoming you at Cinnamon Bistro.
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
              Pre-Order Reference
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
              maxWidth: '580px',
              margin: '0 auto 2.25rem',
              textAlign: 'left',
            }}
          >
            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Linked Reservation
              </span>
              <strong style={{ fontFamily: "Georgia, serif", fontSize: '1.05rem', color: '#282115' }}>
                {selectedReservation ? `#${getReservationReference(selectedReservation)}` : `#${selectedReservationId}`}
              </strong>
            </div>

            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Total Amount
              </span>
              <strong style={{ fontFamily: "Georgia, serif", fontSize: '1.05rem', color: '#8c6736' }}>
                {formatCurrency(success.totalAmount || success.TotalAmount || displayedTotal)}
              </strong>
            </div>

            <div style={{ background: '#fdfbf7', border: '1px solid #f0e7db', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Service Status
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
              to="/reservations/history"
              className="bistro-button-outline"
              style={{ textDecoration: 'none', padding: '0.65rem 1.4rem' }}
            >
              View My Reservations
            </Link>
            <Link
              to="/menu"
              className="bistro-button-outline"
              style={{ textDecoration: 'none', padding: '0.65rem 1.4rem' }}
            >
              Explore Menu
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
        eyebrow="Table Pre-Order Service"
        title={
          <>
            Reservation <em>Pre-Order</em>
          </>
        }
        subtitle="Link your cart selections to an upcoming table booking so dishes are prepared seamlessly upon your arrival."
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
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            color: '#991b1b',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Cart Items Review */}
        <section
          className="bistro-card"
          style={{
            position: 'relative',
            background: '#ffffff',
            border: '1px solid #eedfc9',
            borderRadius: '14px',
            padding: '1.75rem',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(40, 33, 21, 0.04)',
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '1.35rem',
                margin: 0,
                color: '#282115',
                fontWeight: 600,
              }}
            >
              Selected Dishes
            </h2>
            <span
              style={{
                fontSize: '0.8rem',
                color: '#8c6736',
                background: '#faf5ec',
                border: '1px solid #eedfc9',
                borderRadius: '9999px',
                padding: '0.2rem 0.65rem',
                fontWeight: 600,
              }}
            >
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#78716c' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>
                Your order cart is currently empty.
              </p>
              <Link
                to="/menu"
                className="bistro-button-gold"
                style={{ textDecoration: 'none', display: 'inline-block', padding: '0.55rem 1.25rem' }}
              >
                Browse Our Menu
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {items.map((item, index) => {
                  const quantity = getItemQuantity(item);
                  const price = getItemPrice(item);
                  const name = getItemName(item);

                  return (
                    <article
                      key={`${getMenuItemId(item)}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.85rem 1rem',
                        background: '#fdfbf7',
                        border: '1px solid #f0e7db',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Cloche Icon Placeholder */}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#faf4e8',
                            border: '1px solid #eedfc9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#c5a059',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                            <line x1="6" y1="1" x2="6" y2="4" />
                            <line x1="10" y1="1" x2="10" y2="4" />
                            <line x1="14" y1="1" x2="14" y2="4" />
                          </svg>
                        </div>

                        <div>
                          <h3
                            style={{
                              margin: '0 0 0.25rem',
                              fontFamily: "Georgia, 'Times New Roman', serif",
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: '#282115',
                            }}
                          >
                            {name}
                          </h3>
                          <div style={{ fontSize: '0.82rem', color: '#78716c' }}>
                            <span>{quantity} × {formatCurrency(price)}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            fontWeight: 700,
                            color: '#8c6736',
                            fontSize: '1.02rem',
                          }}
                        >
                          {formatCurrency(price * quantity)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #eee5d7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#443a2d' }}>
                  Subtotal
                </span>
                <span
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#8c6736',
                  }}
                >
                  {formatCurrency(displayedTotal)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Reservation Selection & Order Confirmation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Reservation Selection Card */}
          <section
            className="bistro-card"
            style={{
              position: 'relative',
              background: '#ffffff',
              border: '1px solid #eedfc9',
              borderRadius: '14px',
              padding: '1.75rem',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(40, 33, 21, 0.04)',
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
                fontSize: '1.35rem',
                margin: '0 0 0.5rem',
                color: '#282115',
                fontWeight: 600,
              }}
            >
              Select Table Booking
            </h2>

            <p style={{ color: '#78716c', fontSize: '0.86rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Choose which upcoming table reservation you want this pre-order linked to.
            </p>

            {reservations.length === 0 ? (
              <div
                style={{
                  background: '#faf6ee',
                  border: '1px dashed #eedfc9',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#78716c', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                  No reservations found for your account. Please book a table before submitting a pre-order.
                </p>
                <Link
                  to="/availability"
                  className="bistro-button-gold"
                  style={{ textDecoration: 'none', display: 'inline-block', padding: '0.5rem 1.2rem', fontSize: '0.86rem' }}
                >
                  Book a Table Now
                </Link>
              </div>
            ) : (
              <div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="reservationPicker"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#443a2d',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Your Upcoming Reservations
                  </label>
                  <select
                    id="reservationPicker"
                    value={selectedReservationId}
                    onChange={(event) => setSelectedReservationId(event.target.value)}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #eedfc9',
                      background: '#faf6ee',
                      fontSize: '0.92rem',
                      color: '#282115',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select a reservation…</option>
                    {reservations.map((reservation) => {
                      const id = getReservationId(reservation);
                      const ref = getReservationReference(reservation);
                      const status = getReservationStatus(reservation);
                      const date = getReservationDate(reservation);
                      const table = getReservationTableNumber(reservation);

                      return (
                        <option key={id} value={id}>
                          #{ref} — Table {table} ({formatDateTime(date)}) [{status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Reservation Preview Card */}
                {selectedReservation && (
                  <div
                    style={{
                      background: '#fdfbf7',
                      border: '1px solid #eedfc9',
                      borderRadius: '10px',
                      padding: '1.15rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#8c6736',
                          background: '#faf5ec',
                          border: '1px solid #eedfc9',
                          borderRadius: '6px',
                          padding: '0.15rem 0.5rem',
                        }}
                      >
                        #{getReservationReference(selectedReservation)}
                      </span>

                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          background: '#ecfdf5',
                          color: '#15803d',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        {getReservationStatus(selectedReservation)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.84rem' }}>
                      <div>
                        <span style={{ display: 'block', color: '#78716c', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Table
                        </span>
                        <strong style={{ fontFamily: "Georgia, serif", color: '#282115', fontSize: '0.98rem' }}>
                          Table {getReservationTableNumber(selectedReservation)}
                        </strong>
                      </div>

                      <div>
                        <span style={{ display: 'block', color: '#78716c', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Guests
                        </span>
                        <strong style={{ color: '#282115' }}>
                          {getReservationGuestCount(selectedReservation)} Guests
                        </strong>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ display: 'block', color: '#78716c', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Scheduled Arrival
                        </span>
                        <strong style={{ color: '#282115' }}>
                          {formatDateTime(getReservationDate(selectedReservation))}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Submission & Summary Card */}
          <section
            className="bistro-card"
            style={{
              position: 'relative',
              background: '#ffffff',
              border: '1px solid #eedfc9',
              borderRadius: '14px',
              padding: '1.75rem',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(40, 33, 21, 0.04)',
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
                fontSize: '1.35rem',
                margin: '0 0 1rem',
                color: '#282115',
                fontWeight: 600,
              }}
            >
              Confirm Pre-Order
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#443a2d' }}>
                <span>Selected Items ({items.length})</span>
                <span>{formatCurrency(displayedTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c', fontSize: '0.82rem' }}>
                <span>Taxes & Service</span>
                <span>Calculated at checkout</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #eee5d7',
                }}
              >
                <span style={{ fontWeight: 700, color: '#282115' }}>Total</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: '1.35rem', fontWeight: 700, color: '#8c6736' }}>
                  {formatCurrency(displayedTotal)}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#78716c', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              * Final prices and availability are strictly revalidated by the kitchen during transmission.
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                items.length === 0 ||
                reservations.length === 0 ||
                !selectedReservationId
              }
              className="bistro-button-gold"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: (submitting || items.length === 0 || !selectedReservationId) ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      borderTopColor: '#ffffff',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Transmitting Pre-Order…</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Confirm Reservation Pre-Order</span>
                </>
              )}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ReservationPreOrderPage;

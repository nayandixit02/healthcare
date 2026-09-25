import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, DollarSign, Building, Stethoscope, CreditCard, Ban, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function BookingsPage({ onPayBooking, openAuthModal }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const statuses = ['ALL', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'];

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getBookings({
        status: statusFilter === 'ALL' ? '' : statusFilter
      });
      setBookings(res.items || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, statusFilter]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking appointment?')) return;
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId, { cancellation_reason: 'Cancelled from patient portal' });
      fetchBookings();
    } catch (err) {
      alert(`Could not cancel booking: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '40px' }} className="glass-panel">
        <Calendar size={54} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
        <h2>Sign In to View Your Bookings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
          Please authenticate with your account or use the instant demo patient login.
        </p>
        <button className="btn btn-primary" onClick={openAuthModal}>
          Sign In / Demo Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#fff' }}>Diagnostic Test Bookings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            {user.role === 'admin' ? 'Displaying all system patient appointments (Admin mode)' : 'Manage your upcoming test appointments and simulate payments.'}
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchBookings}>
          <RefreshCw size={15} /> Refresh List
        </button>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {statuses.map(s => {
          const active = (s === 'ALL' && !statusFilter) || statusFilter === s;
          return (
            <button
              key={s}
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => setStatusFilter(s === 'ALL' ? '' : s)}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading appointments...
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Calendar size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3>No Bookings Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>You have no bookings matching the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.map(booking => {
            const formattedDate = new Date(booking.appointment_datetime).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div key={booking.id} className="glass-panel" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  
                  {/* Left info */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <Stethoscope size={22} color="var(--primary)" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
                          {booking.test ? booking.test.name : `Diagnostic Test #${booking.test_id}`}
                        </h3>
                        <span className={`badge badge-${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={14} color="var(--text-dim)" /> {booking.centre ? booking.centre.name : `Centre #${booking.centre_id}`} ({booking.centre?.city})
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={14} color="var(--text-dim)" /> {formattedDate}
                        </span>
                      </div>

                      {booking.notes && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '6px', fontStyle: 'italic' }}>
                          Note: "{booking.notes}"
                        </div>
                      )}

                      {booking.cancellation_reason && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: '4px' }}>
                          Cancellation Reason: {booking.cancellation_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Price & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>LOCKED AMOUNT</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{Number(booking.amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        ID: #{booking.id}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(booking.status === 'PENDING' || booking.status === 'FAILED') && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                          onClick={() => onPayBooking(booking)}
                        >
                          <CreditCard size={15} />
                          Pay Now
                        </button>
                      )}

                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          disabled={cancellingId === booking.id}
                          onClick={() => handleCancel(booking.id)}
                        >
                          <Ban size={15} />
                          Cancel
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

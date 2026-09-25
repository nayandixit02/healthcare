import React, { useState } from 'react';
import { api } from '../services/api';
import { X, CreditCard, CheckCircle2, XCircle, ShieldCheck, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, booking, onPaymentComplete }) {
  const [paymentMethod, setPaymentMethod] = useState('mock_card');
  const [simulateStatus, setSimulateStatus] = useState('SUCCESS');
  const [failureReason, setFailureReason] = useState('Simulated card decline by issuing bank');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !booking) return null;

  const handleSimulate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.simulatePayment({
        booking_id: booking.id,
        simulate_status: simulateStatus,
        payment_method: paymentMethod,
        failure_reason: simulateStatus === 'FAILED' ? failureReason : undefined
      });

      setResult(res.data);
      if (onPaymentComplete) {
        onPaymentComplete(res.data);
      }
    } catch (err) {
      setError(err.message || 'Payment simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '6px' }}>
          <CreditCard size={20} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Simulated Payment Gateway
          </span>
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
          Pay for Booking #{booking.id}
        </h2>

        {/* Amount Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.1), rgba(84, 160, 255, 0.05))',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Payable</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>₹{Number(booking.amount).toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Status</div>
            <span className={`badge badge-${booking.status.toLowerCase()}`}>{booking.status}</span>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {result ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            {result.status === 'SUCCESS' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={54} color="var(--success)" />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--success)' }}>Payment Successful!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Booking status updated to <strong style={{ color: '#fff' }}>CONFIRMED</strong>.
                </p>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  color: 'var(--text-dim)',
                  marginTop: '6px'
                }}>
                  Ref: {result.transaction_ref}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <XCircle size={54} color="var(--danger)" />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--danger)' }}>Payment Failed</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Booking updated to <strong style={{ color: 'var(--danger)' }}>FAILED</strong>.
                </p>
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '4px' }}>
                  Reason: {result.failure_reason}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px' }}
              onClick={onClose}
            >
              Close & View Bookings
            </button>
          </div>
        ) : (
          <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Payment Method */}
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Simulated Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'mock_card', label: 'Credit Card' },
                  { id: 'mock_upi', label: 'UPI / QR' },
                  { id: 'mock_netbanking', label: 'Net Banking' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`btn ${paymentMethod === m.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px', fontSize: '0.8rem' }}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Simulation Trigger Outcome */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                <Sparkles size={14} /> SIMULATION OUTCOME
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: simulateStatus === 'SUCCESS' ? 'var(--success-bg)' : 'transparent',
                  border: `1px solid ${simulateStatus === 'SUCCESS' ? 'var(--success)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}>
                  <input
                    type="radio"
                    name="outcome"
                    value="SUCCESS"
                    checked={simulateStatus === 'SUCCESS'}
                    onChange={() => setSimulateStatus('SUCCESS')}
                  />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>Simulate SUCCESS</span>
                </label>

                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: simulateStatus === 'FAILED' ? 'var(--danger-bg)' : 'transparent',
                  border: `1px solid ${simulateStatus === 'FAILED' ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}>
                  <input
                    type="radio"
                    name="outcome"
                    value="FAILED"
                    checked={simulateStatus === 'FAILED'}
                    onChange={() => setSimulateStatus('FAILED')}
                  />
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Simulate FAILED</span>
                </label>
              </div>

              {simulateStatus === 'FAILED' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Failure Simulation Reason
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`btn ${simulateStatus === 'SUCCESS' ? 'btn-primary' : 'btn-danger'}`}
              style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Processing Simulated Transaction...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Submit {simulateStatus} Payment (₹{Number(booking.amount).toFixed(2)})
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

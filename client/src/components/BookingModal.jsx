import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Calendar, Clock, DollarSign, Building, Stethoscope, AlertCircle } from 'lucide-react';

export default function BookingModal({ isOpen, onClose, centre, testOffer, onBookingCreated }) {
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !centre || !testOffer) return null;

  // Default min date to tomorrow
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!appointmentDate) {
      setError('Please select an appointment date');
      return;
    }

    const isoDateTime = new Date(`${appointmentDate}T${appointmentTime}:00Z`).toISOString();
    setLoading(true);

    try {
      const res = await api.createBooking({
        centre_id: centre.id,
        test_id: testOffer.test_id,
        appointment_datetime: isoDateTime,
        notes
      });

      onBookingCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        style={{ width: '100%', maxWidth: '520px', padding: '30px', position: 'relative' }}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '4px' }}>
          <Stethoscope size={20} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Book Diagnostic Appointment
          </span>
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>
          {testOffer.test ? testOffer.test.name : `Test #${testOffer.test_id}`}
        </h2>

        {/* Centre & Price Summary Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building size={13} /> DIAGNOSTIC CENTRE
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{centre.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{centre.city}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <DollarSign size={13} /> AMOUNT TO PAY
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              ₹{Number(testOffer.price).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>TAT: ~{testOffer.turn_around_hours} Hours</div>
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
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                Appointment Date
              </label>
              <input
                type="date"
                min={tomorrow}
                className="input-field"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                Preferred Time Slot
              </label>
              <select
                className="input-field"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              >
                <option value="08:00">08:00 AM (Fasting Slot)</option>
                <option value="09:30">09:30 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="16:30">04:30 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
              Special Notes / Doctor Prescription Reference (Optional)
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Fasting 10 hours, wheelchair assistance required..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              <Calendar size={16} />
              {loading ? 'Creating Booking...' : 'Confirm & Proceed to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '../services/api';
import { Terminal, Send, Copy, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function WebhookConsolePage() {
  const [eventId, setEventId] = useState(`evt_test_${Date.now()}`);
  const [eventType, setEventType] = useState('payment.success');
  const [bookingId, setBookingId] = useState('1');
  const [amount, setAmount] = useState('380.00');
  const [failureReason, setFailureReason] = useState('Card declined by gateway');
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateNewId = () => {
    setEventId(`evt_sim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
  };

  const handleSendWebhook = async (customPayload) => {
    setLoading(true);
    const payload = customPayload || {
      event_id: eventId,
      event_type: eventType,
      booking_id: parseInt(bookingId),
      amount: parseFloat(amount),
      failure_reason: eventType === 'payment.failed' ? failureReason : undefined
    };

    const startTime = performance.now();

    try {
      const res = await api.sendWebhook(payload);
      const elapsed = (performance.now() - startTime).toFixed(1);

      setLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          eventId: payload.event_id,
          eventType: payload.event_type,
          bookingId: payload.booking_id,
          status: res.status,
          isDuplicate: res.is_duplicate,
          bookingStatus: res.booking_status,
          message: res.message,
          elapsed,
          rawResponse: res,
          rawPayload: payload,
          success: true
        },
        ...prev
      ]);
    } catch (err) {
      const elapsed = (performance.now() - startTime).toFixed(1);
      setLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          eventId: payload.event_id,
          eventType: payload.event_type,
          bookingId: payload.booking_id,
          status: 'ERROR',
          isDuplicate: false,
          message: err.message,
          elapsed,
          rawResponse: err.data || { error: err.message },
          rawPayload: payload,
          success: false
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTestDuplicate = async () => {
    const testId = `evt_duplicate_test_${Date.now()}`;
    const payload = {
      event_id: testId,
      event_type: 'payment.success',
      booking_id: parseInt(bookingId),
      amount: parseFloat(amount)
    };

    // 1st delivery
    await handleSendWebhook(payload);

    // 2nd delivery with identical event_id (Duplicate)
    setTimeout(async () => {
      await handleSendWebhook(payload);
    }, 600);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(95, 39, 205, 0.15)', border: '1px solid rgba(95, 39, 205, 0.3)', padding: '6px 14px', borderRadius: 'var(--radius-full)', color: '#a29bfe', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>
          <Terminal size={14} /> IDEMPOTENT WEBHOOK TEST SUITE
        </div>
        <h1 style={{ fontSize: '2.2rem', color: '#fff' }}>Payment Provider Webhook Simulator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '750px' }}>
          Test the <code style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>POST /payments/webhook/</code> endpoint. Verify strict idempotency where repeated events never produce duplicate payments or corrupted bookings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 420px) 1fr', gap: '24px' }}>
        
        {/* Left Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} color="var(--primary)" /> Send Webhook Event
          </h3>

          <form onSubmit={(e) => { e.preventDefault(); handleSendWebhook(); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Unique Event ID (Idempotency Key)</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  onClick={generateNewId}
                >
                  <RefreshCw size={11} /> Generate New
                </button>
              </div>
              <input
                type="text"
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Event Type</label>
              <select
                className="input-field"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="payment.success">payment.success (Marks Booking CONFIRMED)</option>
                <option value="payment.failed">payment.failed (Marks Booking FAILED)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Target Booking ID</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {eventType === 'payment.failed' && (
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Failure Reason</label>
                <input
                  type="text"
                  className="input-field"
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              disabled={loading}
            >
              <Send size={16} /> {loading ? 'Dispatching Webhook...' : 'Dispatch Webhook Event'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', borderColor: 'rgba(95, 39, 205, 0.4)', color: '#a29bfe' }}
              onClick={handleTestDuplicate}
              disabled={loading}
            >
              <ShieldCheck size={16} /> 1-Click Idempotency Test (Send 2x)
            </button>
          </form>
        </div>

        {/* Right Event Inspector & Logs */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--primary)" /> Real-Time Event Audit Log
            </h3>
            {logs.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setLogs([])}
              >
                Clear Logs
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', padding: '40px' }}>
              <Terminal size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div>No webhook events captured yet.</div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Dispatch an event from the left panel to inspect results.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
              {logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: `1px solid ${log.isDuplicate ? 'rgba(245, 158, 11, 0.3)' : log.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${log.isDuplicate ? 'badge-pending' : log.success ? 'badge-confirmed' : 'badge-failed'}`} style={{ fontSize: '0.68rem' }}>
                        {log.isDuplicate ? 'DUPLICATE IGNORED' : log.status}
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{log.eventType}</span>
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      {log.timestamp} ({log.elapsed}ms)
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.82rem' }}>
                    {log.message}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <div>Event ID: <span style={{ color: '#fff' }}>{log.eventId}</span></div>
                    <div>Target Booking: <span style={{ color: '#fff' }}>#{log.bookingId} {log.bookingStatus ? `(${log.bookingStatus})` : ''}</span></div>
                  </div>

                  {/* Raw payload collapse */}
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem' }}>View Raw JSON Response</summary>
                    <pre style={{ background: '#070b14', padding: '8px', borderRadius: '4px', overflowX: 'auto', marginTop: '6px', color: '#a29bfe', fontSize: '0.72rem' }}>
                      {JSON.stringify(log.rawResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

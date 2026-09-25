import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Plus, Building, Stethoscope, Link, Check, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('centre'); // 'centre', 'test', 'offer'

  // Form states
  const [centreForm, setCentreForm] = useState({ name: '', address: '', city: '', contact_phone: '' });
  const [testForm, setTestForm] = useState({ name: '', code: '', category: '', description: '', default_price: '' });
  const [offerForm, setOfferForm] = useState({ centre_id: '', test_id: '', price: '', turn_around_hours: '24' });

  const [centres, setCentres] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const cRes = await api.getCentres({ limit: 100 });
      const tRes = await api.getTests({ limit: 100 });
      setCentres(cRes.items || []);
      setTests(tRes.items || []);
      if (cRes.items?.length > 0 && !offerForm.centre_id) {
        setOfferForm(prev => ({ ...prev, centre_id: cRes.items[0].id }));
      }
      if (tRes.items?.length > 0 && !offerForm.test_id) {
        setOfferForm(prev => ({ ...prev, test_id: tRes.items[0].id, price: tRes.items[0].default_price }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCentre = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.createCentre(centreForm);
      setSuccessMsg(`Diagnostic Centre '${res.data.name}' created successfully!`);
      setCentreForm({ name: '', address: '', city: '', contact_phone: '' });
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create centre');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.createTest({
        ...testForm,
        default_price: parseFloat(testForm.default_price)
      });
      setSuccessMsg(`Diagnostic Test '${res.data.name}' created successfully!`);
      setTestForm({ name: '', code: '', category: '', description: '', default_price: '' });
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);
    try {
      await api.addTestToCentre(offerForm.centre_id, {
        test_id: parseInt(offerForm.test_id),
        price: parseFloat(offerForm.price),
        turn_around_hours: parseInt(offerForm.turn_around_hours)
      });
      setSuccessMsg('Test pricing & availability mapped to centre successfully!');
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to map test to centre');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '40px' }} className="glass-panel">
        <ShieldCheck size={54} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          This portal requires Administrator or Staff credentials.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-glow)', padding: '6px 14px', borderRadius: 'var(--radius-full)', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>
          <ShieldCheck size={14} /> ADMINISTRATIVE CONTROL PANEL
        </div>
        <h1 style={{ fontSize: '2.2rem', color: '#fff' }}>Medical Resource Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Add diagnostic centres, register test catalog entries, and assign custom pricing per facility.
        </p>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          className={`btn ${activeSubTab === 'centre' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('centre'); setSuccessMsg(''); setErrorMsg(''); }}
        >
          <Building size={16} /> Add Centre
        </button>
        <button
          className={`btn ${activeSubTab === 'test' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('test'); setSuccessMsg(''); setErrorMsg(''); }}
        >
          <Stethoscope size={16} /> Add Diagnostic Test
        </button>
        <button
          className={`btn ${activeSubTab === 'offer' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('offer'); setSuccessMsg(''); setErrorMsg(''); }}
        >
          <Link size={16} /> Map Test to Centre & Price
        </button>
      </div>

      {/* Feedback Banners */}
      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Forms */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        
        {/* Form 1: Add Centre */}
        {activeSubTab === 'centre' && (
          <form onSubmit={handleCreateCentre} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>Create New Diagnostic Centre</h3>
            
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Centre Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Apollo Diagnostics Hub"
                required
                value={centreForm.name}
                onChange={(e) => setCentreForm({ ...centreForm, name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Address</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 100 Health City Avenue, Sector 5"
                required
                value={centreForm.address}
                onChange={(e) => setCentreForm({ ...centreForm, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>City</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Bengaluru"
                  required
                  value={centreForm.city}
                  onChange={(e) => setCentreForm({ ...centreForm, city: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Contact Phone</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="+91-80-12345678"
                  value={centreForm.contact_phone}
                  onChange={(e) => setCentreForm({ ...centreForm, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} disabled={loading}>
              <Plus size={16} /> {loading ? 'Saving...' : 'Register Diagnostic Centre'}
            </button>
          </form>
        )}

        {/* Form 2: Add Diagnostic Test */}
        {activeSubTab === 'test' && (
          <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>Register New Diagnostic Test</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Test Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Serum Electrolytes Panel"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Unique Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. SERUM_ELEC"
                  required
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  value={testForm.code}
                  onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Category</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Biochemistry, Radiology..."
                  required
                  value={testForm.category}
                  onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Default Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="450.00"
                  required
                  value={testForm.default_price}
                  onChange={(e) => setTestForm({ ...testForm, default_price: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Clinical purpose and instructions for sample collection..."
                value={testForm.description}
                onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} disabled={loading}>
              <Plus size={16} /> {loading ? 'Saving...' : 'Create Diagnostic Test'}
            </button>
          </form>
        )}

        {/* Form 3: Map Test to Centre */}
        {activeSubTab === 'offer' && (
          <form onSubmit={handleAddOffer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>Map Test to Centre & Set Custom Pricing</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Select Centre</label>
                <select
                  className="input-field"
                  value={offerForm.centre_id}
                  onChange={(e) => setOfferForm({ ...offerForm, centre_id: e.target.value })}
                >
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Select Diagnostic Test</label>
                <select
                  className="input-field"
                  value={offerForm.test_id}
                  onChange={(e) => {
                    const sel = tests.find(t => t.id === parseInt(e.target.value));
                    setOfferForm({
                      ...offerForm,
                      test_id: e.target.value,
                      price: sel ? sel.default_price : offerForm.price
                    });
                  }}
                >
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Code: {t.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Centre-Specific Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  required
                  value={offerForm.price}
                  onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Turnaround Time (Hours)</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={offerForm.turn_around_hours}
                  onChange={(e) => setOfferForm({ ...offerForm, turn_around_hours: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} disabled={loading}>
              <Link size={16} /> {loading ? 'Saving...' : 'Assign Test to Centre'}
            </button>
          </form>
        )}

      </div>

    </div>
  );
}

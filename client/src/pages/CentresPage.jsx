import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Phone, Clock, DollarSign, ChevronRight, Stethoscope, Building, Sparkles } from 'lucide-react';

export default function CentresPage({ onBookTest, openAuthModal }) {
  const { user } = useAuth();
  const [centres, setCentres] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCentreId, setExpandedCentreId] = useState(null);
  const [centreDetails, setCentreDetails] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const cities = ['All', 'Bengaluru', 'Mumbai', 'New Delhi', 'Chennai'];

  const fetchCentres = async () => {
    setLoading(true);
    try {
      const res = await api.getCentres({
        city: selectedCity === 'All' ? '' : selectedCity,
        search
      });
      setCentres(res.items || []);
      // Auto-expand first centre
      if (res.items && res.items.length > 0 && !expandedCentreId) {
        handleToggleExpand(res.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load centres:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, [selectedCity]);

  const handleToggleExpand = async (id) => {
    if (expandedCentreId === id) {
      setExpandedCentreId(null);
      return;
    }
    setExpandedCentreId(id);

    if (!centreDetails[id]) {
      setLoadingDetail(true);
      try {
        const res = await api.getCentre(id);
        setCentreDetails(prev => ({ ...prev, [id]: res.data }));
      } catch (err) {
        console.error('Failed to load centre detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleBookClick = (centre, offer) => {
    if (!user) {
      openAuthModal();
      return;
    }
    onBookTest(centre, offer);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-glow)', padding: '6px 14px', borderRadius: 'var(--radius-full)', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px' }}>
          <Sparkles size={15} /> ACCREDITED DIAGNOSTIC NETWORK
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#fff' }}>
          Diagnostic Centres & Test Offerings
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1rem' }}>
          Explore certified medical laboratories, view real-time test pricing & turnaround times, and schedule appointments instantly.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        {/* City Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {cities.map(c => {
            const active = (c === 'All' && !selectedCity) || selectedCity === c;
            return (
              <button
                key={c}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                onClick={() => setSelectedCity(c === 'All' ? '' : c)}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={(e) => { e.preventDefault(); fetchCentres(); }} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '40px' }}
              placeholder="Search by centre name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', height: '40px' }}>
            Search
          </button>
        </form>
      </div>

      {/* Centres List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading diagnostic centres...
        </div>
      ) : centres.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Building size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3>No Diagnostic Centres Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Try adjusting your search query or city filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {centres.map(centre => {
            const isExpanded = expandedCentreId === centre.id;
            const details = centreDetails[centre.id];

            return (
              <div key={centre.id} className={`glass-panel ${isExpanded ? 'glow-border' : ''}`} style={{ overflow: 'hidden' }}>
                {/* Centre Header Row */}
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => handleToggleExpand(centre.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(0, 210, 211, 0.1)',
                      border: '1px solid rgba(0, 210, 211, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building size={22} color="var(--primary)" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>{centre.name}</h3>
                        <span className="badge badge-primary">{centre.city}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} color="var(--text-dim)" /> {centre.address}
                        </span>
                        {centre.contact_phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} color="var(--text-dim)" /> {centre.contact_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                      {isExpanded ? 'Hide Tests' : 'View Available Tests'}
                      <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  </div>
                </div>

                {/* Expanded Tests Catalog for this Centre */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '20px 24px'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Available Diagnostic Tests at this Centre ({details?.test_offers?.length || 0})
                    </div>

                    {loadingDetail && !details ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading tests catalog...</div>
                    ) : details?.test_offers?.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No tests currently configured for this centre.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                        {details?.test_offers?.map(offer => (
                          <div
                            key={offer.id}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                  {offer.test?.category || 'General'}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                  CODE: {offer.test?.code}
                                </span>
                              </div>

                              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '4px' }}>
                                {offer.test?.name || `Diagnostic Test #${offer.test_id}`}
                              </h4>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                {offer.test?.description || 'Standard diagnostic panel.'}
                              </p>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '10px',
                              borderTop: '1px solid var(--border-subtle)'
                            }}>
                              <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                                  ₹{Number(offer.price).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} /> TAT: {offer.turn_around_hours}h
                                </div>
                              </div>

                              <button
                                className="btn btn-primary"
                                style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                                onClick={() => handleBookClick(centre, offer)}
                              >
                                <Stethoscope size={14} />
                                Book Test
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

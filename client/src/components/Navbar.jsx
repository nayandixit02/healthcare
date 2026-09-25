import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Calendar, ShieldCheck, Terminal, User, LogOut, Sparkles, Building2, Stethoscope } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, openAuthModal }) {
  const { user, logout, loginDemo } = useAuth();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10, 15, 29, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '12px 24px'
    }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('centres')}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 210, 211, 0.4)'
          }}>
            <Activity size={24} color="#04121a" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>EVE</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 400, color: 'var(--primary)' }}>HEALTHCARE</span>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>BACKEND DEMO</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Diagnostic Bookings & Payment Gateway</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'centres' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('centres')}
          >
            <Building2 size={16} />
            Centres & Tests
          </button>

          <button
            className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={16} />
            My Bookings
          </button>

          <button
            className={`btn ${activeTab === 'webhook' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('webhook')}
          >
            <Terminal size={16} />
            Webhook Console
          </button>

          {user && (user.role === 'admin' || user.role === 'staff') && (
            <button
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('admin')}
            >
              <ShieldCheck size={16} />
              Admin Portal
            </button>
          )}
        </nav>

        {/* User Auth Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{user.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-confirmed'}`} style={{ fontSize: '0.65rem' }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user.email}</span>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '8px' }}
                onClick={logout}
                title="Logout"
              >
                <LogOut size={16} color="var(--danger)" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Demo quick switch */}
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'var(--primary-glow)', color: 'var(--primary)' }}
                onClick={() => loginDemo('patient')}
                title="Quick login as Demo Patient"
              >
                <Sparkles size={14} />
                Demo Patient
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'rgba(95, 39, 205, 0.4)', color: '#a29bfe' }}
                onClick={() => loginDemo('admin')}
                title="Quick login as Demo Admin"
              >
                <ShieldCheck size={14} />
                Demo Admin
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '7px 14px', fontSize: '0.85rem' }}
                onClick={openAuthModal}
              >
                <User size={15} />
                Sign In
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

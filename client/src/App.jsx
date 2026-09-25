import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CentresPage from './pages/CentresPage';
import BookingsPage from './pages/BookingsPage';
import WebhookConsolePage from './pages/WebhookConsolePage';
import AdminPage from './pages/AdminPage';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import PaymentModal from './components/PaymentModal';

function MainLayout() {
  const [activeTab, setActiveTab] = useState('centres');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Booking modal state
  const [bookingModalData, setBookingModalData] = useState(null); // { centre, testOffer }

  // Payment modal state
  const [paymentBooking, setPaymentBooking] = useState(null);

  const handleOpenBookingModal = (centre, testOffer) => {
    setBookingModalData({ centre, testOffer });
  };

  const handleBookingCreated = (newBooking) => {
    // Prompt payment immediately for seamless UX
    setPaymentBooking(newBooking);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={() => setAuthModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'centres' && (
          <CentresPage
            onBookTest={handleOpenBookingModal}
            openAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsPage
            onPayBooking={(b) => setPaymentBooking(b)}
            openAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'webhook' && (
          <WebhookConsolePage />
        )}

        {activeTab === 'admin' && (
          <AdminPage />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.85rem',
        marginTop: '60px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>EVE Healthcare</strong> — SDE Backend Engineering Assignment (Node.js & Express + PostgreSQL + React)
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="http://localhost:5000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Swagger OpenAPI Specs
            </a>
            <a href="http://localhost:5000/health" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              API Health
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {bookingModalData && (
        <BookingModal
          isOpen={!!bookingModalData}
          centre={bookingModalData.centre}
          testOffer={bookingModalData.testOffer}
          onClose={() => setBookingModalData(null)}
          onBookingCreated={handleBookingCreated}
        />
      )}

      {paymentBooking && (
        <PaymentModal
          isOpen={!!paymentBooking}
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onPaymentComplete={() => {
            setActiveTab('bookings');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

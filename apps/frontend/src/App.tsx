import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientTriageBooking } from './components/PatientTriageBooking';
import { ExplainTriage } from './components/ExplainTriage';
import { AuthModal } from './components/AuthModal';
import { INITIAL_DOCTORS, INITIAL_TRIAGE_CASES } from './services/triageMock';
import type { Doctor, TriageAssessment, User } from './types';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [cases, setCases] = useState<TriageAssessment[]>(INITIAL_TRIAGE_CASES);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Dark Mode preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pulsecare_theme') === 'dark';
  });

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('pulsecare_theme', next ? 'dark' : 'light');
  };

  // Check Spring Boot backend health on mount
  useEffect(() => {
    fetch('http://localhost:8080/actuator/health')
      .then(res => res.json())
      .catch(() => {});
  }, []);

  const handleBookSuccess = (newAssessment: TriageAssessment) => {
    setCases(prev => [newAssessment, ...prev]);
    setIsBookingModalOpen(false);
  };

  const handleUpdateCase = (updated: TriageAssessment) => {
    setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleLoginSuccess = (user: User, _token: string) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('accessToken');
  };

  return (
    <div
      data-surface="warm"
      data-theme={darkMode ? 'dark' : 'light'}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f3eb',
        color: '#1a110a',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Header conforming directly to the wireframe states */}
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onGetCare={() => setIsBookingModalOpen(true)}
        onGoHome={() => setCurrentUser(null)}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main View:
          1) If not logged in -> Landing Page
          2) If logged in as Patient -> Patient Dashboard for that particular patient
          3) If logged in as Doctor -> Doctor Dashboard with warm brown/cream background
      */}
      <main style={{ flex: 1 }}>
        {!currentUser && (
          <LandingPage
            onGetCare={() => setIsBookingModalOpen(true)}
            onSelectDoctor={(_name) => setIsBookingModalOpen(true)}
            onBookSpecialty={(_spec) => setIsBookingModalOpen(true)}
            onSignIn={() => setIsAuthOpen(true)}
          />
        )}

        {currentUser?.role === 'PATIENT' && (
          <PatientDashboard
            currentUser={currentUser}
            onBookVideo={() => setIsBookingModalOpen(true)}
            onHospitalSearch={() => setIsBookingModalOpen(true)}
            onOpenRecords={() => setIsExplainModalOpen(true)}
            onOrderMeds={() => alert('Order medicine request received. Connecting to partner pharmacy (MedPlus).')}
            onJoinCall={() => alert('Launching encrypted WebRTC teleconsultation room with Dr. Kavita Shah...')}
          />
        )}

        {currentUser?.role === 'DOCTOR' && (
          <DoctorDashboard
            cases={cases}
            onUpdateCase={handleUpdateCase}
          />
        )}
      </main>

      {/* Interactive Booking & Triage Modal */}
      {isBookingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 17, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 24px 64px rgba(75, 68, 57, 0.25)',
            border: '1px solid #eae3d8',
          }}>
            <button
              onClick={() => setIsBookingModalOpen(false)}
              style={{
                position: 'sticky',
                top: '16px',
                right: '16px',
                float: 'right',
                zIndex: 10,
                backgroundColor: '#f5efe6',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#785b47',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ padding: '24px 12px 12px 12px' }}>
              <PatientTriageBooking
                doctors={doctors}
                onBookSuccess={handleBookSuccess}
                currentUser={currentUser}
                onNavigateToExplain={() => {
                  setIsBookingModalOpen(false);
                  setIsExplainModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Explain Triage Modal */}
      {isExplainModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 17, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 24px 64px rgba(75, 68, 57, 0.25)',
            border: '1px solid #eae3d8',
            padding: '24px',
          }}>
            <button
              onClick={() => setIsExplainModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: '#f5efe6',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#785b47',
              }}
            >
              <X size={20} />
            </button>

            <ExplainTriage
              currentAssessment={cases[0] || null}
              onBookOrChange={() => {
                setIsExplainModalOpen(false);
                setIsBookingModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;

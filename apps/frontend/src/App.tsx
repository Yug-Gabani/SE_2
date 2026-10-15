import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientTriageBooking } from './components/PatientTriageBooking';
import { ExplainTriage } from './components/ExplainTriage';
import { AuthPage } from './components/AuthPage';
import { INITIAL_DOCTORS, INITIAL_TRIAGE_CASES } from './services/triageMock';
import { authApi } from './services/api';
import type { Doctor, TriageAssessment, User } from './types';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return authApi.getSavedAuth().user;
  });
  const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [cases, setCases] = useState<TriageAssessment[]>(INITIAL_TRIAGE_CASES);

  // Modals for Triage and Record explanation
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

  // On mount: Validate saved token against backend /api/auth/me
  useEffect(() => {
    const { token, user } = authApi.getSavedAuth();
    if (token) {
      if (user) setCurrentUser(user);
      authApi.getMe(token)
        .then(validatedUser => {
          setCurrentUser(validatedUser);
        })
        .catch(() => {
          // Token expired or invalid
          authApi.logout();
          setCurrentUser(null);
        });
    }
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
  };

  const handleLogout = () => {
    const { token } = authApi.getSavedAuth();
    authApi.logout(token || undefined);
    setCurrentUser(null);
    navigate('/');
  };

  // Whether we are on a dedicated auth route (/login or /signup)
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

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
      {/* Hide global header on dedicated /login and /signup pages */}
      {!isAuthRoute && (
        <Header
          currentUser={currentUser}
          onOpenAuth={() => navigate('/login')}
          onOpenRegister={() => navigate('/signup')}
          onLogout={handleLogout}
          onGetCare={() => setIsBookingModalOpen(true)}
          onGoHome={() => navigate('/')}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Routed Content */}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Root Route: Shows Landing Page if unauthenticated, or dashboard if authenticated */}
          <Route
            path="/"
            element={
              currentUser?.role === 'DOCTOR' ? (
                <DoctorDashboard cases={cases} onUpdateCase={handleUpdateCase} />
              ) : currentUser?.role === 'PATIENT' ? (
                <PatientDashboard
                  currentUser={currentUser}
                  onBookVideo={() => setIsBookingModalOpen(true)}
                  onHospitalSearch={() => setIsBookingModalOpen(true)}
                  onOpenRecords={() => setIsExplainModalOpen(true)}
                  onOrderMeds={() => alert('Order medicine request received. Connecting to partner pharmacy (MedPlus).')}
                  onJoinCall={() => alert('Launching encrypted WebRTC teleconsultation room with Dr. Kavita Shah...')}
                />
              ) : (
                <LandingPage
                  onGetCare={() => setIsBookingModalOpen(true)}
                  onSelectDoctor={(_name) => setIsBookingModalOpen(true)}
                  onBookSpecialty={(_spec) => setIsBookingModalOpen(true)}
                  onSignIn={() => navigate('/login')}
                />
              )
            }
          />

          {/* Dedicated Login Route */}
          <Route
            path="/login"
            element={
              <AuthPage
                onLoginSuccess={handleLoginSuccess}
                currentUser={currentUser}
              />
            }
          />

          {/* Dedicated Signup Route */}
          <Route
            path="/signup"
            element={
              <AuthPage
                onLoginSuccess={handleLoginSuccess}
                currentUser={currentUser}
              />
            }
          />

          {/* Patient Dashboard Route */}
          <Route
            path="/patient"
            element={
              currentUser?.role === 'DOCTOR' ? (
                <Navigate to="/doctor" replace />
              ) : (
                <PatientDashboard
                  currentUser={currentUser || {
                    id: 'guest-patient-id',
                    email: 'guest.patient@pulsecare.com',
                    fullName: 'Sarah Jenkins',
                    role: 'PATIENT',
                  }}
                  onBookVideo={() => setIsBookingModalOpen(true)}
                  onHospitalSearch={() => setIsBookingModalOpen(true)}
                  onOpenRecords={() => setIsExplainModalOpen(true)}
                  onOrderMeds={() => alert('Order medicine request received. Connecting to partner pharmacy (MedPlus).')}
                  onJoinCall={() => alert('Launching encrypted WebRTC teleconsultation room with Dr. Kavita Shah...')}
                />
              )
            }
          />

          {/* Doctor Dashboard Route */}
          <Route
            path="/doctor"
            element={
              <DoctorDashboard
                cases={cases}
                onUpdateCase={handleUpdateCase}
              />
            }
          />

          {/* Fallback redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
    </div>
  );
};

export default App;

import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientTriageBooking } from './components/PatientTriageBooking';
import { MyAppointments } from './components/MyAppointments';
import { AppointmentDetail } from './components/AppointmentDetail';
import { MyPrescriptions } from './components/MyPrescriptions';
import { Hospitals } from './components/Hospitals';
import { HospitalDetail } from './components/HospitalDetail';
import { PatientProfile } from './components/PatientProfile';
import { AuthPage } from './components/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { authApi } from './services/api';
import type { User } from './types';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(
    () => authApi.getSavedAuth().user
  );
  const [sessionReady, setSessionReady] = useState<boolean>(false);

  // Validate the saved token against the backend on mount.
  useEffect(() => {
    const { token } = authApi.getSavedAuth();
    if (!token) {
      setSessionReady(true);
      return;
    }
    authApi
      .getMe()
      .then(user => setCurrentUser(user))
      .catch(() => {
        authApi.logout();
        setCurrentUser(null);
      })
      .finally(() => setSessionReady(true));
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    navigate('/');
  };

  const handleGetCare = (targetOrSpecialty?: string) => {
    let target = '/book';
    if (typeof targetOrSpecialty === 'string' && targetOrSpecialty) {
      if (targetOrSpecialty.startsWith('/')) {
        target = targetOrSpecialty;
      } else {
        target = `/book?hotspot=${encodeURIComponent(targetOrSpecialty)}`;
      }
    }
    if (!currentUser) {
      navigate(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    if (currentUser.role === 'DOCTOR') {
      navigate('/doctor');
      return;
    }
    navigate(target);
  };

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div
      data-surface="warm"
      data-theme="light"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#eaf6f2',
        color: '#0b3f3a',
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {!isAuthRoute && (
        <Header
          currentUser={currentUser}
          onOpenAuth={() => navigate('/login')}
          onOpenRegister={() => navigate('/signup')}
          onLogout={handleLogout}
          onGetCare={handleGetCare}
          onGoHome={() => navigate('/')}
        />
      )}

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Root: dashboard for signed-in users, landing otherwise */}
          <Route
            path="/"
            element={
              currentUser?.role === 'DOCTOR' ? (
                <Navigate to="/doctor" replace />
              ) : currentUser?.role === 'PATIENT' ? (
                <Navigate to="/patient" replace />
              ) : (
                <LandingPage
                  onGetCare={handleGetCare}
                  onSelectDoctor={handleGetCare}
                  onBookSpecialty={handleGetCare}
                  onSignIn={() => navigate('/login')}
                />
              )
            }
          />

          <Route
            path="/login"
            element={<AuthPage onLoginSuccess={handleLoginSuccess} currentUser={currentUser} />}
          />
          <Route
            path="/signup"
            element={<AuthPage onLoginSuccess={handleLoginSuccess} currentUser={currentUser} />}
          />

          {/* Patient routes */}
          <Route
            path="/patient"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <PatientDashboard currentUser={currentUser!} />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/book"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <PatientTriageBooking currentUser={currentUser} />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/appointments"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <MyAppointments />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/appointments/:id"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <AppointmentDetail />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/prescriptions"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <MyPrescriptions />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/hospitals"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <Hospitals />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/hospitals/:id"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <HospitalDetail />
                </ProtectedRoute>
              ) : null
            }
          />
          <Route
            path="/profile"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['PATIENT']}>
                  <PatientProfile />
                </ProtectedRoute>
              ) : null
            }
          />

          {/* Doctor route (still backed by its internal mock queue) */}
          <Route
            path="/doctor"
            element={
              sessionReady ? (
                <ProtectedRoute user={currentUser} roles={['DOCTOR']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              ) : null
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

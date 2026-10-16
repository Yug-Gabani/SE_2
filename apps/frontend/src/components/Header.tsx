import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
} from 'lucide-react';
import type { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenRegister?: () => void;
  onLogout: () => void;
  onGetCare: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuth,
  onOpenRegister,
  onLogout,
  onGetCare,
  onGoHome,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isPatient = currentUser?.role === 'PATIENT';

  // Active tab detection for Patient
  const isPatientDashboard = location.pathname === '/patient' || (location.pathname === '/' && isPatient);
  const isBookVisit = location.pathname === '/book';
  const isMyAppointments = location.pathname.startsWith('/appointments');

  // Active tab detection for Doctor
  const doctorHash = location.hash;
  const isDoctorQueue = location.pathname.startsWith('/doctor') && (!doctorHash || doctorHash === '#my-queue' || doctorHash === '#queue');
  const isDoctorAvailability = location.pathname.startsWith('/doctor') && doctorHash === '#availability';
  const isDoctorPatients = location.pathname.startsWith('/doctor') && doctorHash === '#patients';
  const isDoctorTranscripts = location.pathname.startsWith('/doctor') && doctorHash === '#transcripts';

  const getNavLinkStyle = (isActive: boolean) => ({
    color: isActive ? '#1a110a' : '#706b63',
    fontWeight: isActive ? 600 : 500,
    textDecoration: 'none',
    cursor: 'pointer',
    padding: '8px 2px',
    borderBottom: isActive ? '2px solid #785b47' : '2px solid transparent',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
  });

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #eae3d8',
      boxShadow: '0 2px 10px rgba(75, 68, 57, 0.04)',
      width: '100%',
    }}>
      {/* Main Single-Line Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        boxSizing: 'border-box',
      }}>
        {/* Left Brand: ● PulseCare */}
        <div
          onClick={onGoHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            flexShrink: 0,
            userSelect: 'none',
          }}
          title="PulseCare Home"
        >
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#785b47',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a110a',
            letterSpacing: '-0.02em',
          }}>
            PulseCare
          </span>
        </div>

        {/* Middle Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          {!currentUser && (
            <>
              <a
                href="#find-doctors"
                onClick={e => { e.preventDefault(); onGetCare(); }}
                style={{ color: '#443e37', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#443e37')}
              >
                Find Doctors
              </a>
              <a
                href="#video-consult"
                onClick={e => { e.preventDefault(); onGetCare(); }}
                style={{ color: '#443e37', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#443e37')}
              >
                Video Consult
              </a>
              <a
                href="#for-hospitals"
                style={{ color: '#443e37', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#443e37')}
              >
                For Hospitals
              </a>
            </>
          )}

          {isPatient && (
            <>
              <a
                href="/patient"
                onClick={e => { e.preventDefault(); navigate('/patient'); }}
                style={getNavLinkStyle(isPatientDashboard)}
                onMouseEnter={e => { if (!isPatientDashboard) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isPatientDashboard) e.currentTarget.style.color = '#706b63'; }}
              >
                Dashboard
              </a>
              <a
                href="/book"
                onClick={e => { e.preventDefault(); navigate('/book'); }}
                style={getNavLinkStyle(isBookVisit)}
                onMouseEnter={e => { if (!isBookVisit) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isBookVisit) e.currentTarget.style.color = '#706b63'; }}
              >
                Book Visit
              </a>
              <a
                href="/appointments"
                onClick={e => { e.preventDefault(); navigate('/appointments'); }}
                style={getNavLinkStyle(isMyAppointments)}
                onMouseEnter={e => { if (!isMyAppointments) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isMyAppointments) e.currentTarget.style.color = '#706b63'; }}
              >
                My Appointments
              </a>
            </>
          )}

          {isDoctor && (
            <>
              <a
                href="/doctor#my-queue"
                onClick={e => { e.preventDefault(); navigate('/doctor#my-queue'); }}
                style={getNavLinkStyle(isDoctorQueue)}
                onMouseEnter={e => { if (!isDoctorQueue) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isDoctorQueue) e.currentTarget.style.color = '#706b63'; }}
              >
                My Queue
              </a>
              <a
                href="/doctor#availability"
                onClick={e => { e.preventDefault(); navigate('/doctor#availability'); }}
                style={getNavLinkStyle(isDoctorAvailability)}
                onMouseEnter={e => { if (!isDoctorAvailability) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isDoctorAvailability) e.currentTarget.style.color = '#706b63'; }}
              >
                Availability
              </a>
              <a
                href="/doctor#patients"
                onClick={e => { e.preventDefault(); navigate('/doctor#patients'); }}
                style={getNavLinkStyle(isDoctorPatients)}
                onMouseEnter={e => { if (!isDoctorPatients) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isDoctorPatients) e.currentTarget.style.color = '#706b63'; }}
              >
                Patients
              </a>
              <a
                href="/doctor#transcripts"
                onClick={e => { e.preventDefault(); navigate('/doctor#transcripts'); }}
                style={getNavLinkStyle(isDoctorTranscripts)}
                onMouseEnter={e => { if (!isDoctorTranscripts) e.currentTarget.style.color = '#1a110a'; }}
                onMouseLeave={e => { if (!isDoctorTranscripts) e.currentTarget.style.color = '#706b63'; }}
              >
                Transcripts
              </a>
            </>
          )}
        </nav>

        {/* Right Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
        }}>

          {!currentUser && (
            <>
              <button
                onClick={onOpenAuth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#443e37',
                  cursor: 'pointer',
                  padding: '6px 12px',
                }}
              >
                Sign in
              </button>
              <button
                onClick={onOpenRegister || onOpenAuth}
                style={{
                  backgroundColor: '#f5efe6',
                  color: '#785b47',
                  border: '1px solid #eae3d8',
                  borderRadius: '9999px',
                  padding: '8px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#eae3d8';
                  e.currentTarget.style.color = '#543b2a';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#f5efe6';
                  e.currentTarget.style.color = '#785b47';
                }}
              >
                Sign up
              </button>
              <button
                onClick={onGetCare}
                style={{
                  backgroundColor: '#785b47',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#644b39')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#785b47')}
              >
                Get Care
              </button>
            </>
          )}

          {isPatient && (
            <>
              {/* Notification Bell with 2 badge */}
              <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Bell size={19} color="#443e37" />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: '#785b47',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  2
                </span>
              </div>

              {/* Patient User & Sign Out */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={onOpenAuth}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2a241d',
                    cursor: 'pointer',
                  }}
                  title="Switch profile"
                >
                  <span>{currentUser.fullName || 'Avi Patel'}</span>
                  <ChevronDown size={14} color="#785b47" />
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8c857b',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '2px 4px',
                  }}
                  title="Sign Out"
                >
                  Sign out
                </button>
              </div>
            </>
          )}

          {isDoctor && (
            <>
              {/* Notification Bell with 1 badge */}
              <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Bell size={18} color="#1a110a" />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: '#785b47',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  1
                </span>
              </div>

              {/* Doctor Profile & Sign Out */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={onOpenAuth}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1a110a',
                    cursor: 'pointer',
                  }}
                  title="Switch profile"
                >
                  <span>{currentUser.fullName || 'Dr. Kavita Shah'} ⌄</span>
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8c857b',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '2px 4px',
                  }}
                  title="Sign Out"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

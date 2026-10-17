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

  // Active tab detection for Guest
  const isGuestHome = !currentUser && location.pathname === '/' && (!location.hash || location.hash === '' || location.hash === '#home');
  const isGuestFindDoctors = !currentUser && location.hash === '#find-doctors';
  const isGuestVideoConsult = !currentUser && location.hash === '#video-consult';
  const isGuestHospitals = !currentUser && (location.pathname.startsWith('/hospitals') || location.hash === '#for-hospitals' || location.hash === '#hospitals');

  // Active tab detection for Patient
  const isPatientDashboard = isPatient && (location.pathname === '/patient' || location.pathname === '/');
  const isBookVisit = isPatient && location.pathname === '/book';
  const isMyAppointments = isPatient && location.pathname.startsWith('/appointments');
  const isPrescriptions  = isPatient && location.pathname.startsWith('/prescriptions');
  const isHospitals      = isPatient && location.pathname.startsWith('/hospitals');
  const isProfile        = isPatient && location.pathname === '/profile';

  // Active tab detection for Doctor
  const doctorHash = location.hash;
  const isDoctorQueue = isDoctor && location.pathname.startsWith('/doctor') && (!doctorHash || doctorHash === '#my-queue' || doctorHash === '#queue');
  const isDoctorAvailability = isDoctor && location.pathname.startsWith('/doctor') && doctorHash === '#availability';
  const isDoctorPatients = isDoctor && location.pathname.startsWith('/doctor') && doctorHash === '#patients';
  const isDoctorPrescriptions = isDoctor && ((location.pathname.startsWith('/doctor') && doctorHash === '#prescriptions') || location.pathname.startsWith('/prescriptions'));
  const isDoctorTranscripts = isDoctor && location.pathname.startsWith('/doctor') && doctorHash === '#transcripts';

  const getNavLinkStyle = (isActive: boolean): React.CSSProperties => ({
    color: isActive ? '#1a110a' : '#6b6359',
    fontWeight: isActive ? 600 : 500,
    textDecoration: 'none',
    cursor: 'pointer',
    height: '72px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 4px',
    borderBottom: isActive ? '3px solid #785b47' : '3px solid transparent',
    transition: 'color 0.15s ease, border-color 0.15s ease',
    boxSizing: 'border-box',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.color = '#1a110a';
      e.currentTarget.style.borderBottom = '3px solid #dfd7cc';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.color = '#6b6359';
      e.currentTarget.style.borderBottom = '3px solid transparent';
    }
  };

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
          height: '100%',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          {!currentUser && (
            <>
              <a
                href="/"
                onClick={e => {
                  e.preventDefault();
                  navigate('/');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={getNavLinkStyle(isGuestHome)}
                onMouseEnter={e => handleMouseEnter(e, isGuestHome)}
                onMouseLeave={e => handleMouseLeave(e, isGuestHome)}
              >
                Home
              </a>
              <a
                href="#find-doctors"
                onClick={e => {
                  e.preventDefault();
                  navigate('/#find-doctors');
                  const el = document.getElementById('find-doctors');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else onGetCare();
                }}
                style={getNavLinkStyle(isGuestFindDoctors)}
                onMouseEnter={e => handleMouseEnter(e, isGuestFindDoctors)}
                onMouseLeave={e => handleMouseLeave(e, isGuestFindDoctors)}
              >
                Find Doctors
              </a>
              <a
                href="#video-consult"
                onClick={e => {
                  e.preventDefault();
                  navigate('/#video-consult');
                  const el = document.getElementById('video-consult');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else onGetCare();
                }}
                style={getNavLinkStyle(isGuestVideoConsult)}
                onMouseEnter={e => handleMouseEnter(e, isGuestVideoConsult)}
                onMouseLeave={e => handleMouseLeave(e, isGuestVideoConsult)}
              >
                Video Consult
              </a>
              <a
                href="#for-hospitals"
                onClick={e => {
                  e.preventDefault();
                  navigate('/#for-hospitals');
                  const el = document.getElementById('for-hospitals');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else onGetCare();
                }}
                style={getNavLinkStyle(isGuestHospitals)}
                onMouseEnter={e => handleMouseEnter(e, isGuestHospitals)}
                onMouseLeave={e => handleMouseLeave(e, isGuestHospitals)}
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
                onMouseEnter={e => handleMouseEnter(e, isPatientDashboard)}
                onMouseLeave={e => handleMouseLeave(e, isPatientDashboard)}
              >
                Dashboard
              </a>
              <a
                href="/book"
                onClick={e => { e.preventDefault(); navigate('/book'); }}
                style={getNavLinkStyle(isBookVisit)}
                onMouseEnter={e => handleMouseEnter(e, isBookVisit)}
                onMouseLeave={e => handleMouseLeave(e, isBookVisit)}
              >
                Book Visit
              </a>
              <a
                href="/appointments"
                onClick={e => { e.preventDefault(); navigate('/appointments'); }}
                style={getNavLinkStyle(isMyAppointments)}
                onMouseEnter={e => handleMouseEnter(e, isMyAppointments)}
                onMouseLeave={e => handleMouseLeave(e, isMyAppointments)}
              >
                My Appointments
              </a>
              <a
                href="/prescriptions"
                onClick={e => { e.preventDefault(); navigate('/prescriptions'); }}
                style={getNavLinkStyle(isPrescriptions)}
                onMouseEnter={e => handleMouseEnter(e, isPrescriptions)}
                onMouseLeave={e => handleMouseLeave(e, isPrescriptions)}
              >
                Prescriptions
              </a>
              <a
                href="/hospitals"
                onClick={e => { e.preventDefault(); navigate('/hospitals'); }}
                style={getNavLinkStyle(isHospitals)}
                onMouseEnter={e => handleMouseEnter(e, isHospitals)}
                onMouseLeave={e => handleMouseLeave(e, isHospitals)}
              >
                Hospitals
              </a>
              <a
                href="/profile"
                onClick={e => { e.preventDefault(); navigate('/profile'); }}
                style={getNavLinkStyle(isProfile)}
                onMouseEnter={e => handleMouseEnter(e, isProfile)}
                onMouseLeave={e => handleMouseLeave(e, isProfile)}
              >
                Profile
              </a>
            </>
          )}

          {isDoctor && (
            <>
              <a
                href="/doctor#my-queue"
                onClick={e => { e.preventDefault(); navigate('/doctor#my-queue'); }}
                style={getNavLinkStyle(isDoctorQueue)}
                onMouseEnter={e => handleMouseEnter(e, isDoctorQueue)}
                onMouseLeave={e => handleMouseLeave(e, isDoctorQueue)}
              >
                My Queue
              </a>
              <a
                href="/doctor#availability"
                onClick={e => { e.preventDefault(); navigate('/doctor#availability'); }}
                style={getNavLinkStyle(isDoctorAvailability)}
                onMouseEnter={e => handleMouseEnter(e, isDoctorAvailability)}
                onMouseLeave={e => handleMouseLeave(e, isDoctorAvailability)}
              >
                Availability
              </a>
              <a
                href="/doctor#patients"
                onClick={e => { e.preventDefault(); navigate('/doctor#patients'); }}
                style={getNavLinkStyle(isDoctorPatients)}
                onMouseEnter={e => handleMouseEnter(e, isDoctorPatients)}
                onMouseLeave={e => handleMouseLeave(e, isDoctorPatients)}
              >
                Patients
              </a>
              <a
                href="/doctor#prescriptions"
                onClick={e => { e.preventDefault(); navigate('/doctor#prescriptions'); }}
                style={getNavLinkStyle(isDoctorPrescriptions)}
                onMouseEnter={e => handleMouseEnter(e, isDoctorPrescriptions)}
                onMouseLeave={e => handleMouseLeave(e, isDoctorPrescriptions)}
              >
                Prescriptions
              </a>
              <a
                href="/doctor#transcripts"
                onClick={e => { e.preventDefault(); navigate('/doctor#transcripts'); }}
                style={getNavLinkStyle(isDoctorTranscripts)}
                onMouseEnter={e => handleMouseEnter(e, isDoctorTranscripts)}
                onMouseLeave={e => handleMouseLeave(e, isDoctorTranscripts)}
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
                className="hover-lift"
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
                className="hover-lift"
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
              <div className="icon-pop" style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
              <div className="icon-pop" style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
                  <span>{currentUser.fullName || 'Dr. Kavita Shah'}</span>
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
        </div>
      </div>
    </header>
  );
};

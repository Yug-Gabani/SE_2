import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isPatient = currentUser?.role === 'PATIENT';

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
                style={{ color: '#443e37', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#443e37')}
              >
                Dashboard
              </a>
              <a
                href="/book"
                onClick={e => { e.preventDefault(); navigate('/book'); }}
                style={{ color: '#443e37', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#443e37')}
              >
                Book Visit
              </a>
              <a
                href="/appointments"
                onClick={e => { e.preventDefault(); navigate('/appointments'); }}
                style={{ color: '#1a110a', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
              >
                My Appointments
              </a>
            </>
          )}

          {isDoctor && (
            <>
              <a
                href="#my-queue"
                style={{ color: '#1a110a', fontWeight: 600, textDecoration: 'none' }}
              >
                My Queue
              </a>
              <a
                href="#availability"
                style={{ color: '#706b63', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#706b63')}
              >
                Availability
              </a>
              <a
                href="#patients"
                style={{ color: '#706b63', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#706b63')}
              >
                Patients
              </a>
              <a
                href="#transcripts"
                style={{ color: '#706b63', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a110a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#706b63')}
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

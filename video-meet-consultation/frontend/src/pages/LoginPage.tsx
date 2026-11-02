import React, { useState } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';
import { Stethoscope, UserCheck, ShieldCheck, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'DOCTOR' | 'PATIENT'>('DOCTOR');
  const [specialty, setSpecialty] = useState('Internal Medicine & Telehealth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const data = await authApi.register(email, password, fullName, role, role === 'DOCTOR' ? specialty : undefined);
        onLoginSuccess(data.user);
      } else {
        const data = await authApi.login(email, password);
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to backend server at http://localhost:8000. Please start the backend.');
      } else {
        setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(demoEmail, 'Password123!');
      onLoginSuccess(data.user);
    } catch (err: any) {
      if (!err.response) {
        setError('Backend server offline. Please start the backend: run ./start-app.sh or start uvicorn on port 8000.');
      } else {
        setError(err.response?.data?.detail || 'Quick demo login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #090d16 100%)',
      padding: '2rem 1.5rem',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.1)',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
            marginBottom: '1rem',
          }}>
            <Stethoscope size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem' }}>
            TeleMeet Consult
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            Zoom/Meet Style Telehealth with LangChain AI Clinical Scribe
          </p>
        </div>

        {/* 1-Click Quick Demo Login Shortcuts */}
        <div style={{
          marginBottom: '1.75rem',
          padding: '1rem',
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
        }}>
          <div style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#34d399',
            fontWeight: 700,
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Sparkles size={14} /> One-Click Quick Demo Login
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => quickLogin('doctor@telecare.com')}
              disabled={loading}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '10px',
                padding: '0.65rem 0.5rem',
                color: '#6ee7b7',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <span>🩺 Login as Doctor</span>
              <span style={{ fontSize: '0.68rem', color: '#a7f3d0', opacity: 0.8 }}>Dr. Sarah Mitchell</span>
            </button>

            <button
              type="button"
              onClick={() => quickLogin('patient@telecare.com')}
              disabled={loading}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '10px',
                padding: '0.65rem 0.5rem',
                color: '#93c5fd',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <span>👤 Login as Patient</span>
              <span style={{ fontSize: '0.68rem', color: '#bfdbfe', opacity: 0.8 }}>John Doe</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Robert Chen or John Smith"
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Account Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('DOCTOR')}
                    style={{
                      background: role === 'DOCTOR' ? '#10b981' : 'rgba(30, 41, 59, 0.6)',
                      color: role === 'DOCTOR' ? '#fff' : '#94a3b8',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Physician / Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('PATIENT')}
                    style={{
                      background: role === 'PATIENT' ? '#3b82f6' : 'rgba(30, 41, 59, 0.6)',
                      color: role === 'PATIENT' ? '#fff' : '#94a3b8',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Patient
                  </button>
                </div>
              </div>

              {role === 'DOCTOR' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Neurology, General Medicine"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@telecare.com"
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>{loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Toggle sign in / register */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isRegister ? 'Already have an account? Sign in here' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

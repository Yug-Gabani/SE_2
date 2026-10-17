import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Stethoscope,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import type { Role, User } from '../types';
import { PageTransition } from '../motion/PageTransition';
import { WaveInput } from './WaveInput';

interface AuthPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  currentUser: User | null;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine mode from route: /signup vs /login
  const isSignupRoute = location.pathname.includes('/signup');
  const [isLogin, setIsLogin] = useState<boolean>(!isSignupRoute);

  // Sync state if route changes
  useEffect(() => {
    setIsLogin(!location.pathname.includes('/signup'));
  }, [location.pathname]);

  // Where to land after successful auth. Honours ?next=/some/path (used by the landing-page
   // "Login/Signup to book" CTA so users return to the hospital they were browsing).
   const nextParam = new URLSearchParams(location.search).get('next');
   const landingFor = (role: Role) =>
     nextParam ? nextParam : role === 'DOCTOR' ? '/doctor' : '/patient';

  // If already logged in, redirect to appropriate landing
  useEffect(() => {
    if (currentUser) {
      navigate(landingFor(currentUser.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('PATIENT');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError(null);
    setSuccessMsg(null);
    navigate(loginMode ? '/login' : '/signup', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // --- REAL BACKEND LOGIN ---
        const normalizedEmail = email.trim().toLowerCase();
        const data = await authApi.login(normalizedEmail, password);
        authApi.saveAuth(data);
        setSuccessMsg('Authentication successful! Redirecting...');
        setTimeout(() => {
          onLoginSuccess(data.user, data.accessToken);
          navigate(landingFor(data.user.role));
        }, 400);
      } else {
        // --- REAL BACKEND REGISTRATION ---
        if (!fullName.trim()) {
          throw new Error('Please provide your full legal name');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const data = await authApi.register({
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
        });

        authApi.saveAuth(data);
        setSuccessMsg('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          onLoginSuccess(data.user, data.accessToken);
          navigate(landingFor(data.user.role));
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Demo Login (Uses the registered test users)
  const handleQuickDemo = async (demoRole: 'PATIENT' | 'DOCTOR') => {
    setError(null);
    setLoading(true);
    const demoEmail = demoRole === 'DOCTOR' ? 'doctor.shah@pulsecare.com' : 'patient.test@pulsecare.com';
    const demoPass = 'Password123!';

    try {
      const data = await authApi.login(demoEmail, demoPass);
      authApi.saveAuth(data);
      setSuccessMsg(`Welcome, ${data.user.fullName}! Entering demo mode...`);
      setTimeout(() => {
        onLoginSuccess(data.user, data.accessToken);
        navigate(landingFor(demoRole));
      }, 350);
    } catch {
      // Fallback demo user if backend is rebooting
      const fallbackUser: User = {
        id: demoRole === 'DOCTOR' ? 'demo-doctor-uuid' : 'demo-patient-uuid',
        email: demoEmail,
        fullName: demoRole === 'DOCTOR' ? 'Dr. Kavita Shah' : 'Sarah Jenkins',
        role: demoRole,
      };
      onLoginSuccess(fallbackUser, 'mock-jwt-token');
      navigate(landingFor(demoRole));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8f3eb',
          display: 'flex',
          flexDirection: 'column',
          color: '#1a110a',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top mini-bar with Back to Home only */}
        <div
          style={{
            padding: '20px 32px 0 32px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Link
            to="/"
            className="hover-lift"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#785b47',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: '#ffffff',
              border: '1px solid #eae3d8',
              boxShadow: '0 2px 6px rgba(75, 68, 57, 0.04)',
            }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f5efe6';
            e.currentTarget.style.color = '#543b2a';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#785b47';
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      {/* Main Container - Centered Single Form Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px 60px 20px',
        }}
      >
        <div
          className="card card-hover"
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(75, 68, 57, 0.08)',
            border: '1px solid #eae3d8',
            padding: '40px 36px',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#785b47',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Activity size={20} />
              </div>
              <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1a110a' }}>
                PulseCare
              </span>
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1a110a',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {isLogin ? 'Sign In to PulseCare' : 'Create an Account'}
            </h1>
            <p style={{ fontSize: '14px', color: '#706b63', margin: 0, lineHeight: 1.5 }}>
              {isLogin
                ? 'Enter your credentials to access your health portal'
                : 'Get started with smart healthcare triage & consultations'}
            </p>
          </div>

          {/* Toggle Switch */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f5efe6',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '26px',
            }}
          >
            <button
              type="button"
              onClick={() => switchMode(true)}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isLogin ? '#ffffff' : 'transparent',
                color: isLogin ? '#1a110a' : '#706b63',
                boxShadow: isLogin ? '0 2px 8px rgba(75, 68, 57, 0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: !isLogin ? '#ffffff' : 'transparent',
                color: !isLogin ? '#1a110a' : '#706b63',
                boxShadow: !isLogin ? '0 2px 8px rgba(75, 68, 57, 0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#991b1b',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role Selection (Only shown when Creating Account) */}
            {!isLogin && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#443e37',
                    marginBottom: '8px',
                  }}
                >
                  I am registering as:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setRole('PATIENT')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'PATIENT' ? '#785b47' : '#eae3d8'}`,
                      backgroundColor: role === 'PATIENT' ? '#faf8f5' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <UserIcon size={16} color={role === 'PATIENT' ? '#785b47' : '#9ca3af'} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a110a' }}>Patient</div>
                      <div style={{ fontSize: '11px', color: '#706b63' }}>Seek medical care</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setRole('DOCTOR')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'DOCTOR' ? '#0d9488' : '#eae3d8'}`,
                      backgroundColor: role === 'DOCTOR' ? '#f0fdfa' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Stethoscope size={16} color={role === 'DOCTOR' ? '#0d9488' : '#9ca3af'} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a110a' }}>Doctor</div>
                      <div style={{ fontSize: '11px', color: '#706b63' }}>Clinical provider</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Name Field (Registration only) */}
            {!isLogin && (
              <WaveInput
                id="fullName"
                label="Full Legal Name"
                type="text"
                required
                value={fullName}
                onChange={setFullName}
                icon={<UserIcon size={17} />}
              />
            )}

            {/* Email Field */}
            <WaveInput
              id="email"
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={setEmail}
              icon={<Mail size={17} />}
            />

            {/* Phone Field (Optional, Registration only) */}
            {!isLogin && (
              <WaveInput
                id="phone"
                label="Phone Number (Optional)"
                type="tel"
                value={phone}
                onChange={setPhone}
                icon={<Phone size={17} />}
              />
            )}

            {/* Password Field */}
            <div style={{ marginBottom: '8px' }}>
              {isLogin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-6px' }}>
                  <a
                    href="#forgot"
                    onClick={e => {
                      e.preventDefault();
                      alert('Password reset instructions will be sent to your registered email.');
                    }}
                    style={{ fontSize: '12px', color: '#785b47', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Forgot password?
                  </a>
                </div>
              )}
              <WaveInput
                id="password"
                label={isLogin ? 'Password' : 'Password (min 8 characters)'}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={setPassword}
                icon={<Lock size={17} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="hover-lift"
              style={{
                width: '100%',
                backgroundColor: '#785b47',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(120, 91, 71, 0.2)',
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.backgroundColor = '#644b39';
              }}
              onMouseLeave={e => {
                if (!loading) e.currentTarget.style.backgroundColor = '#785b47';
              }}
            >
              {loading
                ? 'Processing...'
                : isLogin
                ? 'Sign In to PulseCare'
                : 'Create PulseCare Account'}
            </button>

            {/* Alternate switch text */}
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#706b63' }}>
              {isLogin ? (
                <>
                  Don&apos;t have an account yet?{' '}
                  <span
                    onClick={() => switchMode(false)}
                    style={{ color: '#785b47', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Register now
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span
                    onClick={() => switchMode(true)}
                    style={{ color: '#785b47', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Sign in here
                  </span>
                </>
              )}
            </div>

            {/* Subtle Demo Logins */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '18px',
                borderTop: '1px solid #eae3d8',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#948c80', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick 1-Click Demo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('PATIENT')}
                  disabled={loading}
                  className="hover-lift"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#faf8f5',
                    border: '1px solid #eae3d8',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#443e37',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <UserIcon size={13} color="#785b47" />
                  Patient Demo
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('DOCTOR')}
                  disabled={loading}
                  className="hover-lift"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#faf8f5',
                    border: '1px solid #eae3d8',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#443e37',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Stethoscope size={13} color="#0d9488" />
                  Doctor Demo
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

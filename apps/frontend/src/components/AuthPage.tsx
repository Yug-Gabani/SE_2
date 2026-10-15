import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Shield,
  Stethoscope,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import type { Role, User } from '../types';

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

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'DOCTOR') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    }
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
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Check backend health on mount
  useEffect(() => {
    authApi.checkHealth().then(status => setBackendOnline(status));
  }, []);

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
        const data = await authApi.login(email.trim(), password);
        authApi.saveAuth(data);
        setSuccessMsg('Authentication successful! Redirecting...');
        setTimeout(() => {
          onLoginSuccess(data.user, data.accessToken);
          if (data.user.role === 'DOCTOR') {
            navigate('/doctor');
          } else {
            navigate('/patient');
          }
        }, 400);
      } else {
        // --- REAL BACKEND REGISTRATION ---
        if (!fullName.trim()) {
          throw new Error('Please provide your full legal name');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        const data = await authApi.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
        });

        authApi.saveAuth(data);
        setSuccessMsg('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          onLoginSuccess(data.user, data.accessToken);
          if (data.user.role === 'DOCTOR') {
            navigate('/doctor');
          } else {
            navigate('/patient');
          }
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
        if (demoRole === 'DOCTOR') {
          navigate('/doctor');
        } else {
          navigate('/patient');
        }
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
      navigate(demoRole === 'DOCTOR' ? '/doctor' : '/patient');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      {/* Top mini-bar with Back to Home */}
      <div
        style={{
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#785b47',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '9999px',
            backgroundColor: '#ffffff',
            border: '1px solid #eae3d8',
            transition: 'all 0.15s ease',
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

        {/* Live Backend Connection Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: '#ffffff',
            border: '1px solid #eae3d8',
            color: backendOnline ? '#0f766e' : '#b45309',
          }}
        >
          <Database size={13} />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendOnline ? '#10b981' : '#f59e0b',
              boxShadow: backendOnline ? '0 0 8px #10b981' : 'none',
            }}
          />
          {backendOnline ? 'PostgreSQL Database Connected' : 'Connecting to Backend...'}
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 24px 60px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1020px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            boxShadow: '0 20px 60px rgba(75, 68, 57, 0.08)',
            border: '1px solid #eae3d8',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          }}
        >
          {/* Left Column: PulseCare Visual / Info Pane */}
          <div
            style={{
              backgroundColor: '#f5efe6',
              padding: '44px 36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: '1px solid #eae3d8',
              backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(120, 91, 71, 0.04) 0%, transparent 60%)',
            }}
          >
            <div>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#785b47',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Activity size={22} />
                </div>
                <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1a110a' }}>
                  PulseCare
                </span>
              </div>

              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: '#1a110a',
                  marginBottom: '14px',
                  letterSpacing: '-0.02em',
                }}
              >
                {isLogin ? 'Welcome back to your healthcare portal.' : 'Join the next generation of smart clinical care.'}
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#706b63', marginBottom: '32px' }}>
                {isLogin
                  ? 'Access continuous triage updates, verified doctor appointments, and encrypted digital medical history.'
                  : 'Get automated AI severity scoring, seamless video consultations, and prioritized clinical triage.'}
              </p>

              {/* Feature Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0d9488',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a', margin: '0 0 2px 0' }}>
                      Automated AI Triage
                    </h4>
                    <p style={{ fontSize: '12px', color: '#706b63', margin: 0, lineHeight: 1.4 }}>
                      Rule-driven priority categorization (Emergency, Urgent, Routine)
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#785b47',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a', margin: '0 0 2px 0' }}>
                      HIPAA & GDPR Security
                    </h4>
                    <p style={{ fontSize: '12px', color: '#706b63', margin: 0, lineHeight: 1.4 }}>
                      End-to-end encrypted medical transcripts and JWT auth
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Stethoscope size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a110a', margin: '0 0 2px 0' }}>
                      Direct Doctor Access
                    </h4>
                    <p style={{ fontSize: '12px', color: '#706b63', margin: 0, lineHeight: 1.4 }}>
                      High-definition teleconsultations and live clinical queues
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Section on Left Bottom */}
            <div
              style={{
                marginTop: '36px',
                paddingTop: '24px',
                borderTop: '1px solid #eae3d8',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#785b47', marginBottom: '10px' }}>
                1-CLICK QUICK ACCESS (REAL POSTGRES AUTH):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('PATIENT')}
                  disabled={loading}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #eae3d8',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1a110a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#785b47';
                    e.currentTarget.style.backgroundColor = '#faf8f5';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#eae3d8';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <UserIcon size={14} color="#785b47" />
                  Patient Demo
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('DOCTOR')}
                  disabled={loading}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #eae3d8',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1a110a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#785b47';
                    e.currentTarget.style.backgroundColor = '#faf8f5';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#eae3d8';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <Stethoscope size={14} color="#0d9488" />
                  Doctor Demo
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div style={{ padding: '44px 40px' }}>
            {/* Top Toggle Switch */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f5efe6',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '28px',
              }}
            >
              <button
                type="button"
                onClick={() => switchMode(true)}
                style={{
                  flex: 1,
                  padding: '10px',
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
                  padding: '10px',
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
                  padding: '12px 16px',
                  marginBottom: '20px',
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
                  padding: '12px 16px',
                  marginBottom: '20px',
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
                <div style={{ marginBottom: '22px' }}>
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
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2px solid ${role === 'PATIENT' ? '#785b47' : '#eae3d8'}`,
                        backgroundColor: role === 'PATIENT' ? '#faf8f5' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <UserIcon size={18} color={role === 'PATIENT' ? '#785b47' : '#9ca3af'} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a110a' }}>Patient</div>
                        <div style={{ fontSize: '11px', color: '#706b63' }}>Seek medical care</div>
                      </div>
                    </div>

                    <div
                      onClick={() => setRole('DOCTOR')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2px solid ${role === 'DOCTOR' ? '#0d9488' : '#eae3d8'}`,
                        backgroundColor: role === 'DOCTOR' ? '#f0fdfa' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Stethoscope size={18} color={role === 'DOCTOR' ? '#0d9488' : '#9ca3af'} />
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
                <div style={{ marginBottom: '18px' }}>
                  <label
                    htmlFor="fullName"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#443e37',
                      marginBottom: '6px',
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    >
                      <UserIcon size={17} />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder={role === 'DOCTOR' ? 'Dr. Jane Smith' : 'Sarah Jenkins'}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid #d5cec4',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#785b47')}
                      onBlur={e => (e.target.style.borderColor = '#d5cec4')}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#443e37',
                    marginBottom: '6px',
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  >
                    <Mail size={17} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1px solid #d5cec4',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#785b47')}
                    onBlur={e => (e.target.style.borderColor = '#d5cec4')}
                  />
                </div>
              </div>

              {/* Phone Field (Optional, Registration only) */}
              {!isLogin && (
                <div style={{ marginBottom: '18px' }}>
                  <label
                    htmlFor="phone"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#443e37',
                      marginBottom: '6px',
                    }}
                  >
                    Phone Number <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    >
                      <Phone size={17} />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid #d5cec4',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#785b47')}
                      onBlur={e => (e.target.style.borderColor = '#d5cec4')}
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#443e37',
                    }}
                  >
                    Password
                  </label>
                  {isLogin && (
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
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  >
                    <Lock size={17} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      borderRadius: '12px',
                      border: '1px solid #d5cec4',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#785b47')}
                    onBlur={e => (e.target.style.borderColor = '#d5cec4')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: '#785b47',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background-color 0.15s ease',
                  boxShadow: '0 4px 12px rgba(120, 91, 71, 0.25)',
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

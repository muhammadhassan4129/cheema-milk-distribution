import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { Eye, EyeOff, WifiOff, ArrowRight, LogIn } from 'lucide-react';
import { isOnline } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'Admin',       label: 'Admin',       desc: 'Full system access' },
  { value: 'Accountant',  label: 'Accountant',  desc: 'Finance & records' },
  { value: 'MilkTester',  label: 'Milk Tester', desc: 'Route collection' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const online = isOnline();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (!username.trim() || !password) return;
    setError('');
    setSubmitting(true);
    try {
      await login(username, password, role);
      // Navigation: backend role use karo (localStorage mein save hua)
      const savedUser = localStorage.getItem('dairy_user');
      const actualRole: Role = savedUser ? JSON.parse(savedUser).role : role;
      const routeMap: Record<string, string> = {
        'Admin':      '/admin',
        'MilkTester': '/milktester',
        'Accountant': '/accountant',
      };
      navigate(routeMap[actualRole] || '/admin');
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const usernameError = touched.username && !username.trim();
  const passwordError = touched.password && !password;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes float1    { 0%,100% { transform: translateY(0px) scale(1); }   50% { transform: translateY(-18px) scale(1.04); } }
        @keyframes float2    { 0%,100% { transform: translateY(0px) scale(1); }   50% { transform: translateY(14px)  scale(0.97); } }
        @keyframes float3    { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(6deg); } }
        @keyframes pulseglow { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }
        @keyframes shimmer   {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .login-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          background: #f1f5f9;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          display: none;
          width: 460px;
          flex-shrink: 0;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(160deg, #0b1120 0%, #0f172a 45%, #1a1040 100%);
        }
        @media (min-width: 1024px) {
          .left-panel { display: flex; }
          .mobile-brand { display: none !important; }
        }

        /* orbs */
        .orb { position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none; }
        .orb-blue  { width: 320px; height: 320px; background: rgba(59,130,246,0.18); top: -80px;  left: -80px;  animation: pulseglow 6s ease-in-out infinite; }
        .orb-indigo{ width: 280px; height: 280px; background: rgba(99,102,241,0.16); bottom: -60px; right: -60px; animation: pulseglow 8s ease-in-out infinite 2s; }
        .orb-sky   { width: 180px; height: 180px; background: rgba(14,165,233,0.12);  top: 50%;  right: 20px;  animation: pulseglow 5s ease-in-out infinite 1s; }

        /* grid lines overlay */
        .grid-overlay {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* milk drop SVG art */
        .milk-art { position: relative; z-index: 1; margin-bottom: 2.5rem; animation: float1 5s ease-in-out infinite; }

        /* brand name on left */
        .left-brand-name {
          position: relative; z-index: 1; text-align: center;
          color: white; font-size: 1.75rem; font-weight: 900;
          letter-spacing: -0.03em; line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .left-brand-sub {
          position: relative; z-index: 1; text-align: center;
          color: #60a5fa; font-size: 0.6875rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.22em; margin-top: 0.35rem;
        }

        /* stats row */
        .stat-row { position: relative; z-index: 1; display: flex; gap: 1.5rem; margin-top: 2.5rem; }
        .stat-box {
          display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem; padding: 0.875rem 1.25rem; backdrop-filter: blur(12px);
        }
        .stat-num { font-size: 1.25rem; font-weight: 800; color: #e0f2fe; }
        .stat-lbl { font-size: 0.625rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

        /* ── RIGHT PANEL ── */
        .right-panel {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 2rem 1.5rem; min-height: 100vh;
          background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .form-card {
          width: 100%; max-width: 440px;
          background: #ffffff;
          border-radius: 1.5rem;
          padding: 2.25rem 2rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -10px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.1);
        }

        /* mobile brand */
        .mobile-brand {
          display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.75rem;
        }
        .mobile-brand-icon {
          width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; flex-shrink: 0;
          background: linear-gradient(135deg,#3b82f6,#4f46e5);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }

        /* heading */
        .form-heading { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.025em; color: #0f172a; margin-bottom: 0.25rem; }
        .form-subhead { font-size: 0.875rem; color: #94a3b8; font-weight: 400; }

        /* divider */
        .divider { height: 1px; background: #f1f5f9; margin: 1.5rem 0; }

        /* role selector */
        .role-label { font-size: 0.625rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem; }
        .role-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; }
        .role-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.15rem; padding: 0.625rem 0.5rem;
          border-radius: 0.875rem; text-align: center; cursor: pointer;
          border: 2px solid #e2e8f0; background: #f8fafc;
          transition: all 180ms cubic-bezier(0.4,0,0.2,1);
        }
        .role-btn:hover  { border-color: #bfdbfe; background: #eff6ff; }
        .role-btn.active { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .role-btn-name  { font-size: 0.75rem; font-weight: 700; color: #334155; line-height: 1.2; }
        .role-btn.active .role-btn-name { color: #1d4ed8; }
        .role-btn-desc  { font-size: 0.5625rem; font-weight: 500; color: #94a3b8; line-height: 1.2; }
        .role-btn.active .role-btn-desc { color: #60a5fa; }

        /* input group */
        .input-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .field-label {
          font-size: 0.625rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #64748b;
        }
        .input-wrap { position: relative; }
        .field-input {
          display: block; width: 100%; padding: 0.75rem 1rem;
          font-size: 0.875rem; font-family: inherit; line-height: 1.5;
          color: #0f172a; background: #f8fafc;
          border: 1.5px solid #e2e8f0; border-radius: 0.75rem;
          outline: none; transition: border-color 150ms, box-shadow 150ms, background 150ms;
        }
        .field-input:focus   { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .field-input.error   { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .field-input.has-btn { padding-right: 3rem; }
        .field-error { font-size: 0.6875rem; color: #ef4444; font-weight: 600; }

        .eye-btn {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8;
          display: flex; align-items: center; padding: 0; transition: color 150ms;
        }
        .eye-btn:hover { color: #475569; }

        /* banner */
        .banner {
          display: flex; align-items: center; gap: 0.625rem;
          border-radius: 0.75rem; padding: 0.625rem 0.875rem;
          font-size: 0.8125rem; font-weight: 600;
        }
        .banner-warn   { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .banner-error  { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

        /* submit button */
        .submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; padding: 0.8125rem 1.25rem;
          font-size: 0.9375rem; font-weight: 700; font-family: inherit;
          color: #ffffff; border: none; border-radius: 0.875rem;
          background: linear-gradient(135deg,#2563eb,#4f46e5);
          cursor: pointer; transition: all 180ms cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 14px rgba(37,99,235,0.35);
        }
        .submit-btn:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.42); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* credentials hint */
        .creds-hint {
          text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 1.25rem;
          padding-top: 1.25rem; border-top: 1px solid #f1f5f9;
        }
        .creds-mono { font-family: 'Courier New', monospace; font-weight: 700; color: #475569; }
      `}</style>

      <div className="login-root">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="orb orb-blue" />
          <div className="orb orb-indigo" />
          <div className="orb orb-sky" />
          <div className="grid-overlay" />

          <div style={{ zIndex: 1, textAlign: 'center' }}>
            <p className="left-brand-name">Cheema Milk</p>
            <p className="left-brand-sub">Distribution &amp; Collection</p>
          </div>


        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <motion.div
            className="form-card"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Mobile brand */}
            <div className="mobile-brand">
              <div className="mobile-brand-icon">
                <svg width="18" height="22" viewBox="0 0 110 130" fill="none">
                  <path d="M55 10C55 10 15 60 15 85C15 108 33 125 55 125C77 125 95 108 95 85C95 60 55 10 55 10Z" fill="white" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 900, fontSize: '0.9375rem', color: '#0f172a', lineHeight: 1 }}>Cheema Milk</p>
                <p style={{ fontSize: '0.5625rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.2rem' }}>
                  Distribution &amp; Collection
                </p>
              </div>
            </div>

            {/* Heading */}
            <h1 className="form-heading">Welcome back</h1>
            <p className="form-subhead">Sign in to your account to continue</p>

            <div className="divider" />

            <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

              {/* Offline banner */}
              {!online && (
                <div className="banner banner-warn">
                  <WifiOff style={{ width: '0.9375rem', height: '0.9375rem', flexShrink: 0 }} />
                  Offline mode — Admin login only
                </div>
              )}

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="banner banner-error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span style={{ width: '1.125rem', height: '1.125rem', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0, fontSize: '0.6875rem' }}>!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Role selector */}
              <div>
                <p className="role-label">Select Role</p>
                <div className="role-grid">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`role-btn${role === r.value ? ' active' : ''}`}
                    >
                      <span className="role-btn-name">{r.label}</span>
                      <span className="role-btn-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Username */}
              <div className="input-group">
                <label htmlFor="login-username" className="field-label">Username</label>
                <div className="input-wrap">
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setTouched(p => ({ ...p, username: true })); }}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    disabled={submitting}
                    placeholder="Enter your username"
                    className={`field-input${usernameError ? ' error' : ''}`}
                    style={focusedField === 'username' ? { borderColor: '#3b82f6', background: '#fff', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)' } : {}}
                  />
                </div>
                {usernameError && <span className="field-error">Username is required</span>}
              </div>

              {/* Password */}
              <div className="input-group">
                <label htmlFor="login-password" className="field-label">Password</label>
                <div className="input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setTouched(p => ({ ...p, password: true })); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    disabled={submitting}
                    placeholder="Enter your password"
                    className={`field-input has-btn${passwordError ? ' error' : ''}`}
                    style={focusedField === 'password' ? { borderColor: '#3b82f6', background: '#fff', boxShadow: '0 0 0 3px rgba(59,130,246,0.12)' } : {}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeOff style={{ width: '1.0625rem', height: '1.0625rem' }} />
                      : <Eye style={{ width: '1.0625rem', height: '1.0625rem' }} />}
                  </button>
                </div>
                {passwordError && <span className="field-error">Password is required</span>}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting}
                className="submit-btn"
                whileTap={{ scale: 0.985 }}
                style={{ marginTop: '0.25rem' }}
              >
                {submitting ? (
                  <>
                    <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn style={{ width: '1rem', height: '1rem' }} />
                    Sign In
                    <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.125rem' }} />
                  </>
                )}
              </motion.button>

            </form>


          </motion.div>
        </div>
      </div>
    </>
  );
}

import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToRegister?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.login({ email: email.trim(), password });
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        <div className="login-brand-header">
          <div className="login-logo-badge">FP</div>
          <div className="login-brand-info">
            <h1 className="login-brand-name">FeasPro</h1>
            <p className="login-brand-sub">Development Feasibility Platform</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-title-row">
            <div>
              <h2 className="login-title">Sign In</h2>
              <p className="login-subtitle">Access your organization's feasibility portfolio</p>
            </div>
            <div className="login-security-badge" title="Tenant-isolated workspace access">
              <ShieldCheck size={16} />
              <span>Multi-tenant Secure</span>
            </div>
          </div>

          {errorMessage && (
            <div className="login-alert-error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Work Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-field-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} className="input-field-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
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
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <LogIn size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                width: '100%',
                marginTop: '10px',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
              }}
              onClick={() => {
                setEmail('alex@apexproperty.com.au');
                setPassword('password123');
                setTimeout(() => handleSubmit(), 50);
              }}
              disabled={loading}
            >
              <span>⚡ 1-Click Demo Sign-In</span>
            </button>
          </form>

          {onNavigateToRegister && (
            <div className="auth-switch-prompt" style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.86rem', color: '#64748b' }}>
              <span>Don't have an account? </span>
              <button
                type="button"
                className="auth-link-btn"
                onClick={onNavigateToRegister}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Create one
              </button>
            </div>
          )}
        </div>

        <div className="login-page-footer">
          <span>FeasPro v1.0 • Multi-Tenant Real Estate Financial Intelligence</span>
        </div>
      </div>
    </div>
  );
};

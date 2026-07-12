import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, accessToken } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear store errors on mount
  useEffect(() => {
    clearError();
    setValidationError(null);
  }, [clearError]);

  // Redirect if already logged in
  useEffect(() => {
    if (accessToken) {
      navigate('/');
    }
  }, [accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    // Simple validation for 10 digit phone number
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setValidationError('Please enter a valid 10-digit Indian phone number starting with 6-9');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    try {
      await login(phone, password);
      navigate('/');
    } catch (err) {
      // Handled by store error
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #FFFFFF 0%, #F1F5F9 100%)',
      }}
    >
      {/* Background visual glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#FF5A1F]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <GlassCard className="w-full max-w-[420px] fade-up p-8 text-center" strong>
        {/* Brand Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 select-none">
            RIDEFORGE
          </h1>
          <p className="text-sm text-[var(--rx-text-3)] font-medium mt-1">Rider Portal</p>
        </div>

        {/* Forms */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="phone"
            type="text"
            label="Phone Number"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
            }
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            }
          />

          {/* Validation or API errors */}
          {(validationError || error) && (
            <div className="bg-[var(--rx-red-dim)] border border-[rgba(239,68,68,0.2)] rounded-lg p-3.5 text-left flex items-start space-x-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="var(--rx-red)"
                className="w-5 h-5 flex-shrink-0 mt-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span className="text-xs text-[var(--rx-red)] font-medium leading-relaxed">
                {validationError || error}
              </span>
            </div>
          )}

          <Button type="submit" variant="primary" size="md" fullWidth loading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-sm text-[var(--rx-text-3)] font-medium">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-[#FF5A1F] hover:text-orange-600 font-semibold transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

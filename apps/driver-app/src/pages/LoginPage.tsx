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

  useEffect(() => {
    clearError();
    setValidationError(null);
  }, [clearError]);

  useEffect(() => {
    if (accessToken) {
      navigate('/');
    }
  }, [accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

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
      // handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-50">
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF5A1F]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <GlassCard className="w-full max-w-[420px] fade-up p-8 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100 relative z-10">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5A1F] flex items-center justify-center text-white font-black text-2xl shadow-lg mx-auto mb-4">
            RF
          </div>
          <h1 className="text-3xl font-black tracking-wider text-slate-800 select-none">
            RIDE<span className="text-[#FF5A1F]">FORGE</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5">Driver Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="phone"
            type="text"
            label="Phone Number"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
            className="text-left"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
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
            className="text-left"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />

          {(validationError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-left flex items-start space-x-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-xs text-red-600 font-medium leading-relaxed">
                {validationError || (typeof error === 'string' ? error : JSON.stringify(error))}
              </span>
            </div>
          )}

          <Button type="submit" variant="primary" size="md" fullWidth loading={isLoading} className="h-12 rounded-xl">
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-xs text-slate-500 font-bold uppercase tracking-wider">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#FF5A1F] hover:text-orange-600 font-black transition-colors ml-1">
            Sign Up
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

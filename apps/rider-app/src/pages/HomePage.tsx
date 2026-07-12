import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { MapView } from '../components/Map/MapView';
import { GlassCard } from '../components/ui/GlassCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleLaunchSearch = () => {
    navigate('/ride');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Full-screen Map Backdrop */}
      <MapView />

      {/* Floating Header */}
      <header className="absolute top-5 left-4 right-4 z-20 max-w-md mx-auto pointer-events-none">
        <GlassCard className="pointer-events-auto flex items-center justify-between !py-3.5 !px-5" strong>
          <div className="flex items-center space-x-3">
            {/* User Avatar Initial */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(255,90,31,0.25)]">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-left">
              <span className="text-[11px] uppercase tracking-wider text-[var(--rx-text-3)] font-semibold">
                Welcome back
              </span>
              <h2 className="text-sm font-bold text-[var(--rx-text)] -mt-0.5 leading-none">
                {user?.name || 'Rider'}
              </h2>
            </div>
          </div>

          <nav className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/history')}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--rx-text-2)] hover:text-[var(--rx-text)] hover:bg-black/5 transition-all"
            >
              History
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--rx-text-2)] hover:text-[var(--rx-text)] hover:bg-black/5 transition-all"
            >
              Profile
            </button>
          </nav>
        </GlassCard>
      </header>

      {/* Floating Bottom Card */}
      <div className="absolute bottom-8 left-4 right-4 z-20 max-w-md mx-auto">
        <GlassCard
          className="fade-up cursor-pointer hover:border-[#FF5A1F]/30 transition-colors group"
          onClick={handleLaunchSearch}
          strong
        >
          <h3 className="text-left text-lg font-bold text-[var(--rx-text)] mb-1.5 flex items-center justify-between">
            <span>Where to?</span>
            <span className="text-[#FF5A1F] group-hover:translate-x-1 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </h3>
          <p className="text-left text-xs text-[var(--rx-text-2)] mb-4">
            Tap here to enter pickup and destination coordinates.
          </p>

          {/* Dummy inputs for visual look */}
          <div className="space-y-2.5 pointer-events-none">
            <div className="flex items-center space-x-3.5 bg-black/5 border border-black/5 rounded-xl px-4 py-3 text-[var(--rx-text-3)] text-xs font-medium">
              <div className="w-2 h-2 rounded-full border border-[#FF5A1F]/80 bg-[#FF5A1F]/20" />
              <span>Enter pickup location...</span>
            </div>
            <div className="flex items-center space-x-3.5 bg-black/5 border border-black/5 rounded-xl px-4 py-3 text-[var(--rx-text-3)] text-xs font-medium">
              <div className="w-2 h-2 rounded-sm bg-black/40" />
              <span>Enter destination...</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

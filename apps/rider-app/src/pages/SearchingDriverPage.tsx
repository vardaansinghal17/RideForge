import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRideStore } from '../stores/rideStore';

export default function SearchingDriverPage() {
  const navigate = useNavigate();
  const { ride, errorMessage, isRequesting, cancelRide, reset } = useRideStore();
  const status = ride?.status || null;

  useEffect(() => {
    // If there is no ride, no error, and we are not requesting, redirect to home page
    if (!ride && !errorMessage && !isRequesting) {
      const timer = setTimeout(() => {
        // Give the active-ride fetch in ProtectedRoute a brief moment to restore state if needed
        if (
          !useRideStore.getState().ride &&
          !useRideStore.getState().errorMessage &&
          !useRideStore.getState().isRequesting
        ) {
          navigate('/');
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // If ride is accepted, navigate to active ride page
    if (ride && (status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS')) {
      navigate('/active-ride', { replace: true });
    }
  }, [ride, status, errorMessage, isRequesting, navigate]);

  const handleCancel = () => {
    if (ride) {
      cancelRide();
    }
    reset();
    navigate('/');
  };

  const handleTryAgain = () => {
    reset();
    navigate('/ride');
  };

  const handleGoHome = () => {
    reset();
    navigate('/');
  };

  // Dots bounce animation variants
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const dotVariants = {
    animate: {
      y: [0, -6, 0],
      transition: {
        repeat: Infinity,
        duration: 1.0,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col items-center justify-center px-[24px] select-none relative overflow-hidden">
      {/* CSS Keyframe Animation for Radar Pulse */}
      <style>{`
        @keyframes radarPulse {
          0% {
            width: 60px;
            height: 60px;
            opacity: 0.8;
            border-color: #E8441A;
          }
          100% {
            width: 180px;
            height: 180px;
            opacity: 0;
            border-color: #E8441A;
          }
        }
      `}</style>

      {errorMessage ? (
        // No Driver / Error State
        <div className="flex flex-col items-center max-w-xs">
          <motion.div
            className="w-20 h-20 rounded-full bg-[#FFF5F5] flex items-center justify-center mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          >
            <span className="text-[36px]">😔</span>
          </motion.div>

          <h2 className="text-[20px] font-bold text-[#1A1A1A] text-center leading-tight">
            No drivers available
          </h2>

          <p className="text-[14px] text-[#717171] text-center mt-2 leading-relaxed max-w-[260px]">
            All drivers are busy near you. Please try again in a few minutes.
          </p>

          <button
            onClick={handleTryAgain}
            className="w-full h-12 bg-[#E8441A] text-white border-none rounded-xl font-semibold text-[14px] cursor-pointer mt-6 flex items-center justify-center hover:opacity-95 transition-opacity"
          >
            Try again
          </button>

          <span
            onClick={handleGoHome}
            className="text-[13px] text-[#AAAAAA] underline cursor-pointer mt-3 font-medium hover:text-[#717171] transition-colors"
          >
            Go to home
          </span>
        </div>
      ) : (
        // Searching / Radar State
        <div className="flex flex-col items-center w-full max-w-sm">
          {/* Radar Container */}
          <div className="relative w-[180px] h-[180px] flex items-center justify-center mb-10">
            {/* 3 pulsing rings */}
            <div
              className="absolute rounded-full border-2 border-solid border-[#E8441A] bg-transparent"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'radarPulse 2s ease-out infinite 0s',
              }}
            />
            <div
              className="absolute rounded-full border-2 border-solid border-[#E8441A] bg-transparent"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'radarPulse 2s ease-out infinite 0.6s',
              }}
            />
            <div
              className="absolute rounded-full border-2 border-solid border-[#E8441A] bg-transparent"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'radarPulse 2s ease-out infinite 1.2s',
              }}
            />

            {/* Centered Circle */}
            <div className="relative z-10 w-[60px] h-[60px] rounded-full bg-[#111111] flex items-center justify-center shadow-md">
              <span className="text-[26px]">🚗</span>
            </div>
          </div>

          <h2 className="text-[22px] font-bold text-[#1A1A1A] text-center leading-tight">
            Finding your driver
          </h2>

          <div className="text-[14px] text-[#717171] text-center mt-2 flex items-center justify-center gap-1">
            <span>Searching for drivers near you</span>
            <motion.span
              className="flex items-center gap-0.5 mt-2"
              variants={containerVariants}
              animate="animate"
            >
              <motion.span
                className="inline-block w-1 h-1 rounded-full bg-[#E8441A]"
                variants={dotVariants}
              />
              <motion.span
                className="inline-block w-1 h-1 rounded-full bg-[#E8441A]"
                variants={dotVariants}
              />
              <motion.span
                className="inline-block w-1 h-1 rounded-full bg-[#E8441A]"
                variants={dotVariants}
              />
            </motion.span>
          </div>

          {/* Info Card */}
          {ride && (
            <div className="w-full border border-[#EEEEEE] rounded-2xl p-[14px_18px] bg-white text-left mt-7 shadow-sm">
              <div className="flex items-center justify-between gap-2.5">
                <span className="text-[13px] text-[#1A1A1A] font-medium truncate max-w-[45%]">
                  {ride.pickup_address}
                </span>
                <span className="text-[#E8441A] text-[15px] font-bold shrink-0">→</span>
                <span className="text-[13px] text-[#1A1A1A] font-medium truncate max-w-[45%]">
                  {ride.drop_address}
                </span>
              </div>
              <div className="h-[1px] bg-[#EEEEEE] my-2" />
              <div className="text-center text-[12px] text-[#AAAAAA] font-medium">
                Usually takes 15–30 seconds
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="h-11 px-7 bg-[#F5F5F5] text-[#717171] border-none rounded-xl font-semibold text-[13px] cursor-pointer mt-7 hover:bg-[#EAEAEA] transition-colors"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );
}

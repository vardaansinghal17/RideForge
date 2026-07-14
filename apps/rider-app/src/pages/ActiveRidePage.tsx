import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../stores/rideStore';
import { MapView } from '../components/Map/MapView';

export default function ActiveRidePage() {
  const navigate = useNavigate();
  const { ride, driverInfo, driverLocation, cancelRide, reset } = useRideStore();
  const status = ride?.status || null;

  const [etaSeconds, setEtaSeconds] = useState(240); // 4-minute ETA default
  const [initialSeconds] = useState(240);

  // Guard: if ride is null on mount -> navigate('/')
  useEffect(() => {
    if (!ride) {
      const timer = setTimeout(() => {
        if (!useRideStore.getState().ride) {
          navigate('/');
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Status checking
    if (status === 'COMPLETED') {
      navigate('/ride-complete', { replace: true });
    } else if (status === 'CANCELLED') {
      reset();
      navigate('/');
    }
  }, [ride, status, navigate, reset]);

  // ETA countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set ETA to 0 if driver has arrived
  useEffect(() => {
    if (status === 'ARRIVED') {
      setEtaSeconds(0);
    }
  }, [status]);

  if (!ride) return null;

  const pickup = {
    lat: Number(ride.pickup_lat),
    lng: Number(ride.pickup_lng),
    address: ride.pickup_address,
  };
  const drop = {
    lat: Number(ride.drop_lat),
    lng: Number(ride.drop_lng),
    address: ride.drop_address,
  };

  const driverLoc =
    driverLocation?.lat && driverLocation?.lng
      ? { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }
      : undefined;

  // Active step index logic
  const getActiveIndex = () => {
    switch (status) {
      case 'ACCEPTED':
        return 1;
      case 'ARRIVED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveIndex();
  const showCancelButton = status === 'ACCEPTED' || status === 'ARRIVED';

  return (
    <div
      className="w-full h-screen bg-white overflow-hidden relative"
      style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#FFFFFF', overflow: 'hidden' }}
    >
      {/* MAP LAYER */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        <MapView pickup={pickup} drop={drop} driverLocation={driverLoc} />
      </div>

      {/* BOTTOM SHEET */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: '36px',
            height: '4px',
            background: '#E0E0E0',
            borderRadius: '9999px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: '12px',
            marginBottom: '16px',
          }}
        />

        {/* PROGRESS STEPPER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            paddingLeft: '20px',
            paddingRight: '20px',
            marginBottom: '18px',
          }}
        >
          {['Confirmed', 'On the way', 'Arrived', 'In ride'].map((stepLabel, i) => {
            const isCompleted = i < activeIndex;
            const isCurrent = i === activeIndex;
            const isPending = i > activeIndex;

            return (
              <React.Fragment key={stepLabel}>
                {/* LEFT CONNECTOR */}
                {i > 0 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: i <= activeIndex ? '#E8441A' : '#EEEEEE',
                    }}
                  />
                )}

                {/* STEP NODE */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Dot */}
                  {isCurrent ? (
                    <motion.div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: '#E8441A',
                        boxShadow: '0 0 0 4px rgba(232,68,26,0.18)',
                      }}
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: isCompleted ? '#E8441A' : '#EEEEEE',
                        border: isPending ? '1.5px solid #DDDDDD' : 'none',
                      }}
                    />
                  )}

                  {/* Label */}
                  <span
                    style={{
                      fontSize: '10px',
                      marginTop: '5px',
                      textAlign: 'center',
                      maxWidth: '52px',
                      lineHeight: 1.2,
                      color: i <= activeIndex ? '#E8441A' : '#AAAAAA',
                      fontWeight: i <= activeIndex ? 600 : 400,
                    }}
                  >
                    {stepLabel}
                  </span>
                </div>

                {/* RIGHT CONNECTOR */}
                {i < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: i < activeIndex ? '#E8441A' : '#EEEEEE',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STATUS BADGE */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <AnimatePresence mode="wait">
            {status && (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                  display: 'inline-block',
                  borderRadius: '9999px',
                  padding: '6px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor:
                    status === 'ACCEPTED'
                      ? '#FFF8F6'
                      : status === 'ARRIVED'
                      ? '#F0FDF4'
                      : status === 'IN_PROGRESS'
                      ? '#F0F9FF'
                      : '#F5F5F5',
                  color:
                    status === 'ACCEPTED'
                      ? '#E8441A'
                      : status === 'ARRIVED'
                      ? '#16A34A'
                      : status === 'IN_PROGRESS'
                      ? '#0369A1'
                      : '#717171',
                }}
              >
                {status === 'ACCEPTED' && '🚗 Driver is on the way'}
                {status === 'ARRIVED' && '✅ Driver has arrived'}
                {status === 'IN_PROGRESS' && '🛣️ You are on your way'}
                {status === 'REQUESTED' && '🔍 Looking for driver'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DRIVER INFO ROW */}
        <div style={{ paddingLeft: '16px', paddingRight: '16px', marginBottom: '4px' }}>
          <div
            style={{
              border: '1px solid #EEEEEE',
              borderRadius: '16px',
              padding: '16px',
              background: '#FFFFFF',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
            }}
          >
            {/* LEFT — Avatar */}
            <div
              style={{
                width: '58px',
                height: '58px',
                flexShrink: 0,
                position: 'relative',
                background: 'linear-gradient(135deg, #E8441A, #FF8C61)',
                borderRadius: '50%',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textAlign: 'center',
                  lineHeight: '58px',
                }}
              >
                {(driverInfo?.driver_name?.[0] || 'D').toUpperCase()}
              </div>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#22C55E',
                  border: '2.5px solid white',
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  borderRadius: '50%',
                }}
              />
            </div>

            {/* MIDDLE */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1A1A1A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {driverInfo?.driver_name || 'Rahul Kumar'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <span style={{ color: '#F59E0B', fontSize: '13px' }}>★</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#1A1A1A' }}>
                  {driverInfo?.driver_rating || '5.0'}
                </span>
                <span style={{ fontSize: '12px', color: '#717171' }}>· 312 trips</span>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#717171',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {driverInfo?.make || 'Maruti Suzuki'} {driverInfo?.model || 'Dzire'} ·{' '}
                {driverInfo?.color || 'White'}
              </div>

              <span
                style={{
                  marginTop: '5px',
                  display: 'inline-block',
                  background: '#F5F5F5',
                  border: '1px solid #E8E8E8',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                {driverInfo?.plate_number || 'DL 1CA 1234'}
              </span>
            </div>

            {/* RIGHT — ETA SVG Ring */}
            <div style={{ width: '64px', height: '64px', flexShrink: 0, position: 'relative' }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#EEEEEE" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke={etaSeconds === 0 ? '#22C55E' : '#E8441A'}
                  strokeDasharray="163.4"
                  strokeDashoffset={
                    etaSeconds === 0 ? 0 : 163.4 * (1 - (initialSeconds - etaSeconds) / initialSeconds)
                  }
                  transform="rotate(-90 32 32)"
                  style={{
                    transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                  }}
                />

                {etaSeconds > 0 ? (
                  <>
                    <text
                      x="32"
                      y="30"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="#1A1A1A"
                      dominantBaseline="middle"
                    >
                      {Math.ceil(etaSeconds / 60)}m
                    </text>
                    <text
                      x="32"
                      y="44"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#AAAAAA"
                      dominantBaseline="middle"
                    >
                      ETA
                    </text>
                  </>
                ) : (
                  <path
                    d="M20 32 L29 41 L44 23"
                    stroke="#22C55E"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ borderTop: '1px solid #EEEEEE', marginLeft: '16px', marginRight: '16px', marginTop: '12px', marginBottom: '12px' }} />

        {/* ACTIONS ROW */}
        <div
          style={{
            paddingLeft: '16px',
            paddingRight: '16px',
            display: 'flex',
            gap: '10px',
            paddingBottom: '8px',
          }}
        >
          {showCancelButton && (
            <button
              onClick={() => {
                cancelRide();
                reset();
                navigate('/');
              }}
              style={{
                flex: 1,
                height: '46px',
                background: '#FEF2F2',
                color: '#EF4444',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel ride
            </button>
          )}

          <button
            onClick={() => {
              if (driverInfo?.driver_phone) {
                window.open('tel:' + driverInfo.driver_phone);
              }
            }}
            style={{
              width: '44px',
              height: '44px',
              flexShrink: 0,
              background: '#F5F5F5',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              stroke="#1A1A1A"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67 A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 a2 2 0 01-.45 2.11L8.09 9.91 a16 16 0 006 6l1.27-1.27 a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 A2 2 0 0122 16.92z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


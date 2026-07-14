import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRideStore } from '../stores/rideStore';
import { api } from '../lib/axios';
import { MapView } from '../components/Map/MapView';
import { GlassCard } from '../components/ui/GlassCard';
import { BottomSheet } from '../components/BottomSheet/BottomSheet';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LocationAutocomplete, type LocationSuggestion } from '../components/ui/LocationAutocomplete';

type FlowStep = 'LOCATION_INPUT' | 'RIDE_OPTIONS' | 'MATCHING' | 'ACTIVE_RIDE' | 'COMPLETED';

export default function RideFlowPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const {
    connect,
    disconnect,
    requestRide,
    cancelRide,
    reset,
    ride,
    driverInfo,
    driverLocation,
    isRequesting,
    errorMessage,
  } = useRideStore();

  // Coordinates and Inputs
  const [pickupLat, setPickupLat] = useState('28.6139');
  const [pickupLng, setPickupLng] = useState('77.2090');
  const [pickupAddr, setPickupAddr] = useState('Connaught Place, New Delhi');

  const [dropLat, setDropLat] = useState('28.6304');
  const [dropLng, setDropLng] = useState('77.2177');
  const [dropAddr, setDropAddr] = useState('India Gate, New Delhi');

  const [settingTarget, setSettingTarget] = useState<'PICKUP' | 'DROP'>('PICKUP');

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Fare estimation states
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [baseFareEstimate, setBaseFareEstimate] = useState<number>(0);
  const [fareLoading, setFareLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'SEDAN' | 'PRIME' | 'XL'>('SEDAN');

  // Rating completed ride
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Initialize socket
  useEffect(() => {
    if (accessToken) {
      connect(accessToken);
    }
    return () => {
      disconnect();
      reset();
    };
  }, [accessToken, connect, disconnect, reset]);

  // Calculate distance using Haversine formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handlers for when user selects a suggestion from autocomplete
  const handlePickupSelect = (s: LocationSuggestion) => {
    setPickupAddr(s.shortName);
    setPickupLat(s.lat.toFixed(6));
    setPickupLng(s.lng.toFixed(6));
  };

  const handleDropSelect = (s: LocationSuggestion) => {
    setDropAddr(s.shortName);
    setDropLat(s.lat.toFixed(6));
    setDropLng(s.lng.toFixed(6));
  };

  const reverseGeocode = async (lat: number, lng: number, target: 'PICKUP' | 'DROP') => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        const cleanName = parts.slice(0, 3).join(', ');
        if (target === 'PICKUP') {
          setPickupAddr(cleanName);
        } else {
          setDropAddr(cleanName);
        }
        return;
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    }
    // Fallback label when Nominatim is unavailable
    const fallbackName = target === 'PICKUP'
      ? `Pickup (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      : `Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    if (target === 'PICKUP') setPickupAddr(fallbackName);
    else setDropAddr(fallbackName);
  };


  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    setPickupAddr('Detecting current location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const fixedLat = latitude.toFixed(6);
        const fixedLng = longitude.toFixed(6);
        setPickupLat(fixedLat);
        setPickupLng(fixedLng);
        await reverseGeocode(latitude, longitude, 'PICKUP');
        setDetectingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not detect location. Using default instead.');
        setPickupLat('28.6139');
        setPickupLng('77.2090');
        setPickupAddr('Connaught Place, New Delhi');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFetchRoute = () => {
    setGeocodingError(null);

    const resolvedPickupLat = parseFloat(pickupLat);
    const resolvedPickupLng = parseFloat(pickupLng);
    const resolvedDropLat = parseFloat(dropLat);
    const resolvedDropLng = parseFloat(dropLng);

    if (
      isNaN(resolvedPickupLat) ||
      isNaN(resolvedPickupLng) ||
      isNaN(resolvedDropLat) ||
      isNaN(resolvedDropLng)
    ) {
      setGeocodingError('Please select a valid pickup and destination from the suggestions.');
      return;
    }

    const dist = getDistance(resolvedPickupLat, resolvedPickupLng, resolvedDropLat, resolvedDropLng);
    const duration = Math.round(dist * 2.5); // 2.5 mins per km

    setDistanceKm(Number(dist.toFixed(2)));
    setDurationMin(duration);

    navigate('/fare-estimate', {
      state: {
        pickup: { lat: resolvedPickupLat, lng: resolvedPickupLng, address: pickupAddr },
        drop: { lat: resolvedDropLat, lng: resolvedDropLng, address: dropAddr },
        distanceKm: Number(dist.toFixed(2)),
        durationMin: duration,
      },
    });
  };

  // Map click handler to select coordinates
  const handleMapClick = (lat: number, lng: number) => {
    const fixedLat = lat.toFixed(6);
    const fixedLng = lng.toFixed(6);
    if (settingTarget === 'PICKUP') {
      setPickupLat(fixedLat);
      setPickupLng(fixedLng);
      setPickupAddr(`Selected Pickup Location (${fixedLat}, ${fixedLng})`);
      reverseGeocode(lat, lng, 'PICKUP');
    } else {
      setDropLat(fixedLat);
      setDropLng(fixedLng);
      setDropAddr(`Selected Destination (${fixedLat}, ${fixedLng})`);
      reverseGeocode(lat, lng, 'DROP');
    }
  };

  // Requesting ride dispatch
  const handleRequestRide = () => {
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropLat);
    const dLng = parseFloat(dropLng);

    let fareMult = 1.0;
    if (selectedTier === 'PRIME') fareMult = 1.3;
    if (selectedTier === 'XL') fareMult = 1.7;

    const finalFare = Math.round(baseFareEstimate * fareMult);

    requestRide({
      pickupLat: pLat,
      pickupLng: pLng,
      pickupAddress: pickupAddr,
      dropLat: dLat,
      dropLng: dLng,
      dropAddress: dropAddr,
      distanceKm,
      durationMin,
    });
  };

  // Submit Driver Rating
  const handleSubmitRating = async () => {
    if (!ride) return;
    setIsSubmittingRating(true);
    try {
      await api.post(`/rides/${ride.id}/rate`, { rating });
      reset();
      navigate('/');
    } catch (err) {
      console.error(err);
      reset();
      navigate('/');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Determine current active step
  let step: FlowStep = 'LOCATION_INPUT';
  if (ride) {
    if (ride.status === 'COMPLETED') {
      step = 'COMPLETED';
    } else if (['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride.status)) {
      step = 'ACTIVE_RIDE';
    } else {
      step = 'MATCHING';
    }
  } else if (isRequesting) {
    step = 'MATCHING';
  } else if (baseFareEstimate > 0) {
    step = 'RIDE_OPTIONS';
  }

  // Get localized title for active states
  const getRideStatusLabel = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Driver En Route';
      case 'ARRIVED':
        return 'Driver Arrived';
      case 'IN_PROGRESS':
        return 'Trip In Progress';
      default:
        return 'Tracking Ride';
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Floating Header — profile bar (shown on location input and ride options steps) */}
      {(step === 'LOCATION_INPUT' || step === 'RIDE_OPTIONS') && (
        <header className="absolute top-5 left-4 right-4 z-20 max-w-md mx-auto pointer-events-none">
          <GlassCard className="pointer-events-auto flex items-center justify-between !py-3.5 !px-4" strong>
            {/* Back button */}
            <button
              onClick={() => {
                if (step === 'RIDE_OPTIONS') {
                  setBaseFareEstimate(0);
                } else {
                  navigate('/');
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors border border-black/5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4 text-[var(--rx-text)]"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* User info */}
            <div className="flex items-center space-x-2.5">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-[var(--rx-text-3)] font-semibold block">
                  Book a Ride
                </span>
                <h2 className="text-sm font-bold text-[var(--rx-text)] -mt-0.5 leading-none">
                  {user?.name || 'Rider'}
                </h2>
              </div>
              {/* User Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(255,90,31,0.25)] shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          </GlassCard>
        </header>
      )}


      {/* Map backdrop with route details */}
      <MapView
        pickup={parseFloat(pickupLat) ? { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) } : undefined}
        drop={parseFloat(dropLat) ? { lat: parseFloat(dropLat), lng: parseFloat(dropLng) } : undefined}
        driverLocation={driverLocation || undefined}
        onMapClick={step === 'LOCATION_INPUT' ? handleMapClick : undefined}
      />

      {/* STEP 1: Location Inputs */}
      <BottomSheet isOpen={step === 'LOCATION_INPUT'} height="410px" showHandle={false}>
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--rx-text)]">Select Locations</h2>
            <div className="flex bg-black/5 p-0.5 rounded-lg border border-black/5 text-xs font-semibold">
              <button
                onClick={() => setSettingTarget('PICKUP')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  settingTarget === 'PICKUP' ? 'bg-[#FF5A1F] text-white shadow' : 'text-[var(--rx-text-3)]'
                }`}
              >
                Pickup
              </button>
              <button
                onClick={() => setSettingTarget('DROP')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  settingTarget === 'DROP' ? 'bg-[#FF5A1F] text-white shadow' : 'text-[var(--rx-text-3)]'
                }`}
              >
                Destination
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--rx-text-3)] text-left leading-normal">
            💡 Tip: Search by typing below, tap the map, or use current location for pickup.
          </p>

          <div className="space-y-4 text-left">
            {/* Pickup Address with autocomplete */}
            <LocationAutocomplete
              id="pickup-address"
              label="Pickup Address"
              value={pickupAddr}
              placeholder="Search pickup location..."
              onChange={(val) => setPickupAddr(val)}
              onSelect={handlePickupSelect}
              leftIcon={<span className="text-sm">📍</span>}
              rightIcon={
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLocation}
                  className="text-[11px] font-bold text-[#FF5A1F] hover:text-[#E54E18] transition-colors focus:outline-none bg-[#FF5A1F]/10 px-2 py-1 rounded-md border border-[#FF5A1F]/20 flex items-center gap-1 cursor-pointer select-none"
                >
                  {detectingLocation ? '⌛' : '📡 GPS'}
                </button>
              }
            />

            {/* Destination Address with autocomplete */}
            <LocationAutocomplete
              id="destination-address"
              label="Destination Address"
              value={dropAddr}
              placeholder="Search destination (e.g. Red Fort)..."
              onChange={(val) => setDropAddr(val)}
              onSelect={handleDropSelect}
              leftIcon={<span className="text-sm">🏁</span>}
            />
          </div>

          {geocodingError && (
            <div className="text-[12px] text-[var(--rx-red)] font-medium mt-1 text-left">
              ⚠️ {geocodingError}
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            onClick={handleFetchRoute}
            loading={fareLoading}
            className="h-[52px] !mt-6"
          >
            Find Route & Fare
          </Button>
        </div>
      </BottomSheet>

      {/* STEP 2: Ride Selection Options */}
      <BottomSheet isOpen={step === 'RIDE_OPTIONS'} height="410px" showHandle={false}>
        <div className="pt-4 space-y-4">
          <div className="text-left">
            <h2 className="text-base font-bold text-[var(--rx-text)]">Confirm Ride</h2>
            <p className="text-xs text-[var(--rx-text-3)]">
              Distance: {distanceKm} km • Est: {durationMin} mins
            </p>
          </div>

          {/* Ride choices tiers */}
          <div className="space-y-2.5">
            {[
              { id: 'SEDAN', label: 'RideForge Sedan', mult: 1.0, desc: 'Comfortable every day sedan' },
              { id: 'PRIME', label: 'RideForge Prime', mult: 1.3, desc: 'Premium rides with top drivers' },
              { id: 'XL', label: 'RideForge XL', mult: 1.7, desc: 'Spacious SUVs for larger groups' },
            ].map((tier) => {
              const totalFare = Math.round(baseFareEstimate * tier.mult);
              const isActive = selectedTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id as any)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 shadow-[0_0_15px_rgba(255,90,31,0.1)]'
                      : 'bg-black/5 border-black/5 hover:border-black/10'
                  }`}
                >
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-[var(--rx-text)]">{tier.label}</h4>
                    <span className="text-[11px] text-[var(--rx-text-3)]">{tier.desc}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[var(--rx-text)]">₹{totalFare}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="primary" fullWidth onClick={handleRequestRide} className="h-[52px] !mt-5">
            Request {selectedTier}
          </Button>
        </div>
      </BottomSheet>

      {/* STEP 3: Requesting & Matching */}
      <BottomSheet isOpen={step === 'MATCHING'} height="260px" showHandle={false}>
        <div className="pt-6 text-center space-y-4">
          {/* Animated pulse ring */}
          <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute w-full h-full rounded-full border-2 border-[#FF5A1F] opacity-20 animate-ping" />
            <div className="w-10 h-10 rounded-full bg-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5 animate-pulse"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-base font-bold text-[var(--rx-text)]">Finding your ride...</h3>
          <p className="text-xs text-[var(--rx-text-3)]">Connecting with nearby drivers</p>

          {errorMessage && <p className="text-xs text-[var(--rx-red)] font-semibold">{errorMessage}</p>}

          <Button variant="danger" fullWidth onClick={cancelRide} className="h-[48px] !mt-5">
            Cancel Request
          </Button>
        </div>
      </BottomSheet>

      {/* STEP 4: Ride Active */}
      <BottomSheet isOpen={step === 'ACTIVE_RIDE'} height="300px" showHandle={false}>
        <div className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--rx-text)]">
              {getRideStatusLabel(ride?.status || '')}
            </h2>
            <Badge variant="info">{ride?.status}</Badge>
          </div>

          {/* Driver Detail Card */}
          <div className="bg-black/5 border border-black/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] font-bold">
                {driverInfo?.name ? driverInfo.name[0].toUpperCase() : 'D'}
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--rx-text)]">{driverInfo?.name || 'Driver'}</h4>
                <div className="flex items-center text-xs text-[var(--rx-text-3)] mt-0.5 space-x-1.5">
                  <span>⭐ {driverInfo?.rating || '4.9'}</span>
                  <span>•</span>
                  <span>{driverInfo?.plate_number || 'DL-3C-1234'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-[var(--rx-text-3)] block leading-none mb-1">Vehicle</span>
              <span className="text-xs text-[var(--rx-text)] font-semibold block">
                {driverInfo?.make} {driverInfo?.model}
              </span>
            </div>
          </div>

          {/* ETA / Info bar */}
          <div className="flex items-center justify-between text-xs py-1 px-1">
            <span className="text-[var(--rx-text-3)] font-medium">Estimated Arrival Time</span>
            <span className="text-[var(--rx-text)] font-extrabold text-sm">
              {ride?.status === 'IN_PROGRESS' ? 'On Trip' : '4 mins'}
            </span>
          </div>

          {ride?.status !== 'IN_PROGRESS' && (
            <Button variant="danger" fullWidth onClick={cancelRide} className="h-[48px] !mt-4">
              Cancel Ride
            </Button>
          )}
        </div>
      </BottomSheet>

      {/* STEP 5: Trip Completed */}
      <BottomSheet isOpen={step === 'COMPLETED'} height="360px" showHandle={false}>
        <div className="pt-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)] mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-[var(--rx-text)]">Trip Completed!</h3>
          <p className="text-xs text-[var(--rx-text-3)]">Hope you had a comfortable journey.</p>

          <div className="py-2.5 bg-black/5 border border-black/5 rounded-xl max-w-[200px] mx-auto">
            <span className="text-[10px] text-[var(--rx-text-3)] uppercase tracking-wider font-semibold block mb-0.5">
              Fare Charged
            </span>
            <span className="text-2xl font-extrabold text-[var(--rx-text)]">
              ₹{ride?.actual_fare || ride?.estimated_fare}
            </span>
          </div>

          {/* Star selector */}
          <div className="py-1">
            <span className="text-xs text-[var(--rx-text-2)] block mb-2 font-medium">
              Rate your driver partner
            </span>
            <div className="flex justify-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setRatingHover(s)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRating(s)}
                  className="focus:outline-none transition-transform active:scale-95 p-1"
                >
                  <svg
                    className={`w-7 h-7 ${
                      s <= (ratingHover || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-none stroke-slate-300'
                    }`}
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499c.15-.316.593-.316.743 0l2.233 4.526 4.985.725c.349.05.488.48.236.726l-3.607 3.516.851 4.965c.06.349-.31.62-.62.455L12 16.75l-4.462 2.348c-.31.162-.68-.109-.62-.455l.851-4.965-3.607-3.516c-.252-.246-.112-.676.236-.726l4.985-.725 2.233-4.526z"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmitRating}
            loading={isSubmittingRating}
            disabled={rating === 0}
            className="h-[50px] !mt-6"
          >
            Submit & Finish
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

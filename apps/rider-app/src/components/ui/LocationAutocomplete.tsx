import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LocationSuggestion {
  displayName: string;
  shortName: string;
  lat: number;
  lng: number;
  type: 'local' | 'nominatim';
}

// Well-known Delhi/NCR landmarks — instant, no network needed
const LOCAL_PLACES: { name: string; shortName: string; lat: number; lng: number }[] = [
  { name: 'Red Fort, Chandni Chowk, New Delhi',          shortName: 'Red Fort',                  lat: 28.6562, lng: 77.2410 },
  { name: 'India Gate, Rajpath, New Delhi',               shortName: 'India Gate',                 lat: 28.6129, lng: 77.2295 },
  { name: 'Connaught Place, New Delhi',                   shortName: 'Connaught Place (CP)',        lat: 28.6304, lng: 77.2177 },
  { name: 'Lotus Temple, Bahapur, New Delhi',             shortName: 'Lotus Temple',               lat: 28.5535, lng: 77.2588 },
  { name: 'Qutub Minar, Mehrauli, New Delhi',             shortName: 'Qutub Minar',               lat: 28.5245, lng: 77.1855 },
  { name: 'IGI Airport, New Delhi',                       shortName: 'IGI Airport (Terminal 3)',   lat: 28.5562, lng: 77.1000 },
  { name: 'New Delhi Railway Station',                    shortName: 'New Delhi Railway Station',  lat: 28.6420, lng: 77.2197 },
  { name: 'Hazrat Nizamuddin Railway Station',            shortName: 'Nizamuddin Station',         lat: 28.5885, lng: 77.2528 },
  { name: 'Humayun\'s Tomb, Nizamuddin, New Delhi',       shortName: 'Humayun\'s Tomb',            lat: 28.5933, lng: 77.2507 },
  { name: 'Akshardham Temple, New Delhi',                 shortName: 'Akshardham Temple',          lat: 28.6127, lng: 77.2773 },
  { name: 'Lajpat Nagar, New Delhi',                      shortName: 'Lajpat Nagar',               lat: 28.5665, lng: 77.2431 },
  { name: 'Saket, New Delhi',                             shortName: 'Saket',                      lat: 28.5244, lng: 77.2066 },
  { name: 'Hauz Khas, New Delhi',                         shortName: 'Hauz Khas Village',          lat: 28.5494, lng: 77.2001 },
  { name: 'Karol Bagh, New Delhi',                        shortName: 'Karol Bagh',                 lat: 28.6519, lng: 77.1909 },
  { name: 'Dwarka, New Delhi',                            shortName: 'Dwarka Sector 10',           lat: 28.5823, lng: 77.0500 },
  { name: 'Noida Sector 18, Uttar Pradesh',               shortName: 'Noida Sector 18',            lat: 28.5700, lng: 77.3211 },
  { name: 'Gurugram (Gurgaon), Haryana',                  shortName: 'Gurgaon Cyber City',         lat: 28.4949, lng: 77.0877 },
  { name: 'Chandni Chowk, Old Delhi',                     shortName: 'Chandni Chowk',              lat: 28.6505, lng: 77.2303 },
  { name: 'Rohini, New Delhi',                            shortName: 'Rohini Sector 8',            lat: 28.7401, lng: 77.1157 },
  { name: 'Vasant Kunj, New Delhi',                       shortName: 'Vasant Kunj',                lat: 28.5218, lng: 77.1570 },
];

let nominatimTimer: ReturnType<typeof setTimeout> | null = null;

interface LocationAutocompleteProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  id,
  label,
  value,
  placeholder,
  leftIcon,
  rightIcon,
  onChange,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchLocal = useCallback((query: string): LocationSuggestion[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    return LOCAL_PLACES
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map(p => ({
        displayName: p.name,
        shortName: p.shortName,
        lat: p.lat,
        lng: p.lng,
        type: 'local' as const,
      }));
  }, []);

  const searchNominatim = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' India')}&limit=4&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item: { display_name: string; lat: string; lon: string; address?: { road?: string; suburb?: string; city?: string; state?: string } }) => {
        const parts = item.display_name.split(', ');
        const shortName = parts.slice(0, 2).join(', ');
        return {
          displayName: item.display_name,
          shortName,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'nominatim' as const,
        };
      });
    } catch {
      return [];
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    onChange(q);
    setActiveIndex(-1);

    if (!q || q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Instant local results
    const local = searchLocal(q);
    setSuggestions(local);
    setShowDropdown(local.length > 0);

    // Debounced Nominatim
    if (nominatimTimer) clearTimeout(nominatimTimer);
    nominatimTimer = setTimeout(async () => {
      setLoading(true);
      const remote = await searchNominatim(q);
      setLoading(false);

      // Merge: local first, then any non-duplicate Nominatim results
      const localNames = new Set(local.map(s => s.shortName.toLowerCase()));
      const unique = remote.filter(r => !localNames.has(r.shortName.toLowerCase()));
      const merged = [...local, ...unique].slice(0, 6);
      setSuggestions(merged);
      setShowDropdown(merged.length > 0);
    }, 400);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.shortName);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col text-left">
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] text-[var(--rx-text-2)] font-medium mb-1.5 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-[14px] text-[var(--rx-text-3)] flex items-center justify-center pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`glass-input ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
        />

        {rightIcon && (
          <div className="absolute right-[14px] flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-xl border border-[rgba(15,23,42,0.08)] shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          style={{
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lng}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[rgba(15,23,42,0.04)] last:border-0 ${
                i === activeIndex
                  ? 'bg-[#FF5A1F]/8'
                  : 'hover:bg-[rgba(15,23,42,0.03)]'
              }`}
            >
              {/* Pin icon */}
              <span className="text-base mt-0.5 shrink-0">
                {s.type === 'local' ? '📍' : '🔍'}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--rx-text)] truncate">
                  {s.shortName}
                </p>
                <p className="text-[11px] text-[var(--rx-text-3)] truncate leading-snug mt-0.5">
                  {s.displayName}
                </p>
              </div>
            </button>
          ))}

          {/* Loading indicator */}
          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-base">🔍</span>
              <p className="text-[13px] text-[var(--rx-text-3)]">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

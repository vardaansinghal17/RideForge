import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

interface LatLng { lat: number; lng: number; }

interface DriverMapProps {
  /** Driver's current GPS position — animates smoothly on every update */
  driverLocation: LatLng | null;
  /** Pickup point (shown as green pulsing circle) */
  pickup: LatLng | null;
  /** Drop point (shown as dark square) */
  drop: LatLng | null;
  /**
   * Which route to show:
   *  - 'to_pickup'  → draws route from driver → pickup  (ACCEPTED phase)
   *  - 'to_drop'    → draws route from pickup → drop    (IN_PROGRESS phase)
   */
  routeMode: 'to_pickup' | 'to_drop';
}

// Free OSRM routing (no key needed)
const osrmUrl = (aLng: number, aLat: number, bLng: number, bLat: number) =>
  `https://router.project-osrm.org/route/v1/driving/${aLng},${aLat};${bLng},${bLat}?overview=full&geometries=geojson`;

// Tile layer
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── Marker HTML factories ─────────────────────────────────────────────────────

function driverMarkerHtml() {
  return `
    <div style="position:relative;width:44px;height:44px;">
      <div style="
        position:absolute;inset:0;border:2.5px solid #FF5A1F;border-radius:50%;
        animation:driverPulse 2s ease-out infinite;opacity:0.6;
      "></div>
      <div style="
        width:20px;height:20px;background:#FF5A1F;border-radius:50%;
        position:absolute;top:12px;left:12px;
        box-shadow:0 0 14px rgba(255,90,31,0.55);
        border:2px solid #fff;
      "></div>
      <svg style="position:absolute;top:4px;left:7px;width:30px;height:30px;pointer-events:none;"
           viewBox="0 0 24 24" fill="#FF5A1F">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>`;
}

function pickupMarkerHtml() {
  return `
    <div style="position:relative;width:32px;height:32px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,0.2);
        border:2px solid #10B981;animation:pickupPing 2s ease-out infinite;
      "></div>
      <div style="
        width:14px;height:14px;background:#10B981;border-radius:50%;
        position:absolute;top:9px;left:9px;border:2px solid #fff;
        box-shadow:0 0 10px rgba(16,185,129,0.5);
      "></div>
    </div>`;
}

function dropMarkerHtml() {
  return `<div style="
    width:14px;height:14px;background:#1E293B;border-radius:3px;
    border:2px solid #1E293B;box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`;
}

// CSS animations injected once
function injectStyles() {
  if (document.getElementById('driver-map-styles')) return;
  const s = document.createElement('style');
  s.id = 'driver-map-styles';
  s.textContent = `
    @keyframes driverPulse {
      0%   { transform:scale(1);   opacity:0.6; }
      70%  { transform:scale(2.2); opacity:0;   }
      100% { transform:scale(2.2); opacity:0;   }
    }
    @keyframes pickupPing {
      0%   { transform:scale(1);   opacity:0.7; }
      70%  { transform:scale(2);   opacity:0;   }
      100% { transform:scale(2);   opacity:0;   }
    }
  `;
  document.head.appendChild(s);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DriverMap: React.FC<DriverMapProps> = ({
  driverLocation,
  pickup,
  drop,
  routeMode,
}) => {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropMarkerRef   = useRef<L.Marker | null>(null);
  const routeGroupRef   = useRef<L.LayerGroup | null>(null);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    injectStyles();
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.6139, 77.209],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 20 }).addTo(map);

    // Minimal attribution bottom-right
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Driver marker — smooth pan on every position update ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverLocation) return;

    if (!driverMarkerRef.current) {
      const icon = L.divIcon({ html: driverMarkerHtml(), className: '', iconSize: [44, 44], iconAnchor: [22, 22] });
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      // Smooth slide to new position
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    }

    // Keep driver in view
    map.panTo([driverLocation.lat, driverLocation.lng], { animate: true, duration: 0.8, easeLinearity: 0.5 });
  }, [driverLocation]);

  // ── Pickup marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = null;

    if (pickup) {
      const icon = L.divIcon({ html: pickupMarkerHtml(), className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon }).addTo(map);
    }
  }, [pickup]);

  // ── Drop marker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    dropMarkerRef.current?.remove();
    dropMarkerRef.current = null;

    if (drop) {
      const icon = L.divIcon({ html: dropMarkerHtml(), className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
      dropMarkerRef.current = L.marker([drop.lat, drop.lng], { icon }).addTo(map);
    }
  }, [drop]);

  // ── Route polyline (OSRM) — redraws when mode or points change ────────────
  useEffect(() => {
    let active = true;
    const map = mapRef.current;

    routeGroupRef.current?.clearLayers();
    routeGroupRef.current?.remove();
    routeGroupRef.current = null;

    const from = routeMode === 'to_pickup' ? driverLocation : pickup;
    const to   = routeMode === 'to_pickup' ? pickup : drop;

    if (!map || !from || !to) return;

    (async () => {
      try {
        const res  = await fetch(osrmUrl(from.lng, from.lat, to.lng, to.lat));
        const data = await res.json();
        if (!active || !mapRef.current || !data.routes?.length) return;

        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const color = routeMode === 'to_pickup' ? '#10B981' : '#FF5A1F';

        const casing = L.polyline(coords, { color, weight: 10, opacity: 0.12 });
        const main   = L.polyline(coords, { color, weight: 4,  opacity: 0.9  });

        const group = L.layerGroup([casing, main]).addTo(map);
        routeGroupRef.current = group;

        map.fitBounds(L.latLngBounds([[from.lat, from.lng], [to.lat, to.lng]]), {
          padding: [80, 80], animate: true, duration: 1.2,
        });
      } catch (e) {
        console.error('[DriverMap] route error', e);
      }
    })();

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, driverLocation?.lat, driverLocation?.lng]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />
  );
};

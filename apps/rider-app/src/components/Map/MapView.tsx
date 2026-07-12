import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet's default icon paths broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Location {
  lat: number;
  lng: number;
}

interface MapViewProps {
  pickup?: Location;
  drop?: Location;
  driverLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
}

// Light OSM tile layer (CartoDB Positron — free, no key required)
const LIGHT_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Free OSRM routing engine (no API key)
const OSRM_ROUTE_URL = (pLng: number, pLat: number, dLng: number, dLat: number) =>
  `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;

/** Creates the custom coral orange pulsing pickup marker element */
function createPickupElement(): string {
  return '<div style="width:20px;height:20px;border:3px solid #FF5A1F;background:rgba(255,90,31,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:#FF5A1F;border-radius:50%;"></div></div>';
}

/** Creates the custom black square drop marker element */
function createDropElement(): string {
  return '<div style="width:12px;height:12px;border-radius:2px;background:black;border:2px solid black;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>';
}

/** Creates the animated driver marker element (Coral/Orange) */
function createDriverElement(): string {
  return '<div style="width:40px;height:40px;position:relative;"><div style="width:40px;height:40px;border:2px solid #FF5A1F;border-radius:50%;position:absolute;top:0;left:0;animation:driverPulse 2s ease-out infinite;"></div><div style="width:16px;height:16px;background:#FF5A1F;border-radius:50%;position:absolute;top:12px;left:12px;box-shadow:0 0 12px rgba(255,90,31,0.4);"></div></div>';
}

export const MapView: React.FC<MapViewProps> = ({
  pickup,
  drop,
  driverLocation,
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // ── Initialize Map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.209], // New Delhi
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(LIGHT_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Move attribution to bottom-left to stay out of the way of the bottom sheet
    map.attributionControl.setPrefix('');

    mapRef.current = map;

    // Expose click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-wire click handler whenever onMapClick prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [onMapClick]);

  // ── Pickup Marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      const icon = L.divIcon({
        html: createPickupElement(),
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon }).addTo(map);
    }
  }, [pickup]);

  // ── Drop Marker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dropMarkerRef.current) {
      dropMarkerRef.current.remove();
      dropMarkerRef.current = null;
    }

    if (drop) {
      const icon = L.divIcon({
        html: createDropElement(),
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      dropMarkerRef.current = L.marker([drop.lat, drop.lng], { icon }).addTo(map);
    }
  }, [drop]);

  // ── Driver Marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    if (driverLocation) {
      const icon = L.divIcon({
        html: createDriverElement(),
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      driverMarkerRef.current = L.marker(
        [driverLocation.lat, driverLocation.lng],
        { icon }
      ).addTo(map);

      // Auto-pan to driver when no route is active
      if (!pickup || !drop) {
        map.flyTo([driverLocation.lat, driverLocation.lng], 15, { duration: 1 });
      }
    }
  }, [driverLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route Polyline (OSRM) ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const map = mapRef.current;

    // Remove old route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (!map || !pickup || !drop) return;

    const drawRoute = async () => {
      try {
        const res = await fetch(OSRM_ROUTE_URL(pickup.lng, pickup.lat, drop.lng, drop.lat));
        const data = await res.json();

        if (!active || !mapRef.current) return;
        if (!data.routes || data.routes.length === 0) return;

        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );

        // Casing (coral/orange, translucent background)
        const casing = L.polyline(coords, {
          color: '#FF5A1F',
          weight: 8,
          opacity: 0.18,
        });

        // Main route (coral orange)
        const main = L.polyline(coords, {
          color: '#FF5A1F',
          weight: 4,
          opacity: 1,
        });

        casing.addTo(map);
        main.addTo(map);

        // Store as a group so we can remove both at once via a single ref
        // by wrapping them into a LayerGroup
        const group = L.layerGroup([casing, main]).addTo(map);
        // Store the group in routeLayerRef as a Polyline-compatible ref
        routeLayerRef.current = group as unknown as L.Polyline;

        // Fit bounds
        const bounds = L.latLngBounds([
          [pickup.lat, pickup.lng],
          [drop.lat, drop.lng],
        ]);
        map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 1.5 });
      } catch (err) {
        console.error('Error drawing route:', err);
      }
    };

    drawRoute();
    return () => {
      active = false;
    };
  }, [pickup, drop]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#F8F9FA', zIndex: 0 }}
    />
  );
};

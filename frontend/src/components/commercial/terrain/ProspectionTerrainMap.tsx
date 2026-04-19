'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Prospect } from '@/shared/api/commercial/types';

type ProspectLocation = {
  id: string;
  name: string;
  zone: string;
  address: string;
  lat: number;
  lng: number;
};

const CACHE_KEY = 'prospection-terrain-geo';

const setupLeafletIcons = () => {
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

const parseGpsCoordinates = (value?: string) => {
  if (!value) return null;
  const [lat, lng] = value.split(',').map((item) => Number(item.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const buildAddressLabel = (prospect: Prospect) =>
  [prospect.address, prospect.address2, prospect.address3, prospect.city, prospect.region, prospect.country]
    .filter(Boolean)
    .join(', ');

const buildQuery = (prospect: Prospect) => {
  const parts = [
    prospect.address,
    prospect.address2,
    prospect.address3,
    prospect.city,
    prospect.region,
    prospect.country,
  ].filter(Boolean);
  return parts.join(', ');
};

const resolveZoneLabel = (prospect: Prospect, address?: Record<string, string>) => {
  return (
    prospect.city ||
    prospect.region ||
    address?.city_district ||
    address?.suburb ||
    address?.neighbourhood ||
    address?.town ||
    address?.city ||
    address?.county ||
    (prospect.address ? prospect.address.split(',')[0].trim() : null) ||
    prospect.country ||
    'Zone inconnue'
  );
};

const loadCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, { lat: number; lng: number; zone: string; address: string }>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

const useProspectLocations = (prospects: Prospect[]) => {
  const cacheRef = useRef<Record<string, { lat: number; lng: number; zone: string; address: string }>>({});
  const pendingRef = useRef(false);

  const cachedLocations = useMemo(() => {
    if (!cacheRef.current || Object.keys(cacheRef.current).length === 0) {
      cacheRef.current = loadCache();
    }
    return cacheRef.current;
  }, []);

  const locations = useMemo<ProspectLocation[]>(() => {
    return prospects
      .map((prospect) => {
        const gps = parseGpsCoordinates(prospect.gpsCoordinates);
        if (gps) {
          return {
            id: prospect.id,
            name: prospect.companyName,
            zone: prospect.city || prospect.region || prospect.country || 'Zone inconnue',
            address: buildAddressLabel(prospect),
            lat: gps.lat,
            lng: gps.lng,
          };
        }
        const cached = cachedLocations[prospect.id];
        if (!cached) return null;
        return {
          id: prospect.id,
          name: prospect.companyName,
          zone: cached.zone,
          address: cached.address,
          lat: cached.lat,
          lng: cached.lng,
        };
      })
      .filter(Boolean) as ProspectLocation[];
  }, [prospects, cachedLocations]);

  useEffect(() => {
    if (pendingRef.current) return;
    if (prospects.length === 0) return;
    pendingRef.current = true;

    const run = async () => {
      const cache = { ...cacheRef.current };
      const targets = prospects.filter((prospect) => !cache[prospect.id]);
      for (const prospect of targets.slice(0, 30)) {
        const query = buildQuery(prospect);
        if (!query) {
          continue;
        }
        try {
          // polite delay for Nominatim
          await new Promise((resolve) => setTimeout(resolve, 600));
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const payload = await response.json();
          const match = Array.isArray(payload) && payload[0] ? payload[0] : null;
          if (match) {
            const zoneLabel = resolveZoneLabel(prospect, match.address || {});
            cache[prospect.id] = {
              lat: Number(match.lat),
              lng: Number(match.lon),
              zone: zoneLabel,
              address: query,
            };
            cacheRef.current = cache;
            saveCache(cache);
          }
        } catch {
          // ignore
        }
      }
      pendingRef.current = false;
    };

    run();
  }, [prospects]);

  return locations;
};

const MapBounds = ({ locations }: { locations: ProspectLocation[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) return;
    const bounds = new LatLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [locations, map]);

  return null;
};

export default function ProspectionTerrainMap({ prospects }: { prospects: Prospect[] }) {
  useEffect(() => {
    setupLeafletIcons();
  }, []);

  const locations = useProspectLocations(prospects);

  if (!locations.length) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center text-sm text-muted-foreground">
        Aucune localisation disponible pour le moment.
      </div>
    );
  }

  const fallbackCenter = [locations[0].lat, locations[0].lng] as [number, number];

  return (
    <div className="h-[360px] w-full">
      <MapContainer center={fallbackCenter} zoom={11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds locations={locations} />
        <MarkerClusterGroup chunkedLoading>
          {locations.map((location) => (
            <Marker key={location.id} position={[location.lat, location.lng]}>
              <Popup>
                <div className="text-sm font-semibold">{location.name}</div>
                <div className="text-xs text-muted-foreground">{location.zone}</div>
                <div className="text-xs">{location.address}</div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

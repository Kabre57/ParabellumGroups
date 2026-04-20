'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
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

const CACHE_KEY = 'prospection-terrain-geo-v2';

const setupLeafletIcons = () => {
  if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
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
  return [prospect.address, prospect.city, prospect.country].filter(Boolean).join(', ');
};

const resolveZoneLabel = (prospect: Prospect, address?: any) => {
  return (
    prospect.city ||
    prospect.region ||
    address?.city ||
    prospect.country ||
    'Zone inconnue'
  );
};

const loadCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveCache = (cache: any) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const useProspectLocations = (prospects: Prospect[]) => {
  const [locations, setLocations] = useState<ProspectLocation[]>([]);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prospects.length === 0) return;
    if (pendingRef.current) return;

    pendingRef.current = true;
    const run = async () => {
      const cache = loadCache();
      const newLocations: ProspectLocation[] = [];
      let cacheUpdated = false;

      for (const prospect of prospects) {
        const gps = parseGpsCoordinates(prospect.gpsCoordinates);
        if (gps) {
          newLocations.push({
            id: prospect.id,
            name: prospect.companyName,
            zone: prospect.city || 'Zone inconnue',
            address: buildAddressLabel(prospect),
            lat: gps.lat,
            lng: gps.lng,
          });
          continue;
        }

        const cached = cache[prospect.id];
        if (cached) {
          newLocations.push({
            id: prospect.id,
            name: prospect.companyName,
            zone: cached.zone,
            address: cached.address,
            lat: cached.lat,
            lng: cached.lng,
          });
          continue;
        }

        const query = buildQuery(prospect);
        if (query) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`,
              { headers: { 'Accept-Language': 'fr' } }
            );
            const data = await response.json();
            if (data && data[0]) {
              const loc = {
                lat: Number(data[0].lat),
                lng: Number(data[0].lon),
                zone: resolveZoneLabel(prospect, data[0].address),
                address: query,
              };
              cache[prospect.id] = loc;
              cacheUpdated = true;
              newLocations.push({
                id: prospect.id,
                name: prospect.companyName,
                ...loc,
              });
            }
          } catch (e) {
            console.error('Geocoding error', e);
          }
        }
      }

      if (cacheUpdated) saveCache(cache);
      setLocations(newLocations);
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

export default function TerrainMapRender({ prospects }: { prospects: Prospect[] }) {
  const [mounted, setMounted] = useState(false);
  const locations = useProspectLocations(prospects);

  useEffect(() => {
    setMounted(true);
    setupLeafletIcons();
  }, []);

  if (!mounted) return null;

  if (!locations.length) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Aucune localisation trouvée. (Veuillez définir des adresses ou coordonnées GPS valides)
      </div>
    );
  }

  const center = [locations[0].lat, locations[0].lng] as [number, number];

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-md border">
      <MapContainer center={center} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds locations={locations} />
        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup>
              <div className="text-sm font-bold">{loc.name}</div>
              <div className="text-xs text-muted-foreground">{loc.zone}</div>
              <div className="mt-1 text-xs">{loc.address}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

"use client";

import type { MarinaMapMarker } from "@/actions/marinas-map";
import { EmptyState } from "@/components/shared/empty-state";
import { MarinaMapCard } from "@/components/maps/marina-map-card";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";

const marinaIcon = L.divIcon({
  className: "",
  html: `
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#1A9DC4"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
});

function FitBounds({ marinas }: { marinas: MarinaMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (marinas.length === 0) return;
    if (marinas.length === 1) {
      map.setView([marinas[0]!.lat, marinas[0]!.lng], 10);
      return;
    }
    const bounds = L.latLngBounds(marinas.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, marinas]);

  return null;
}

export function MarinaMap({
  marinas,
  className = "h-[400px] w-full rounded-xl",
}: {
  marinas: MarinaMapMarker[];
  className?: string;
}) {
  const [scrollWheelZoom, setScrollWheelZoom] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setScrollWheelZoom(mq.matches);
    const handler = (e: MediaQueryListEvent) => setScrollWheelZoom(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const center = useMemo(() => {
    if (marinas.length === 0) return { lat: 39.8283, lng: -98.5795 };
    const avgLat = marinas.reduce((s, m) => s + m.lat, 0) / marinas.length;
    const avgLng = marinas.reduce((s, m) => s + m.lng, 0) / marinas.length;
    return { lat: avgLat, lng: avgLng };
  }, [marinas]);

  if (marinas.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={MapPin}
          title="No marina locations yet"
          description="Marinas with coordinates will appear on the map."
          className="h-full min-h-[200px] justify-center"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={marinas.length === 1 ? 10 : 5}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds marinas={marinas} />
        {marinas.map((marina) => (
          <Marker
            key={marina.id}
            position={[marina.lat, marina.lng]}
            icon={marinaIcon}
          >
            <Popup>
              <MarinaMapCard marina={marina} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

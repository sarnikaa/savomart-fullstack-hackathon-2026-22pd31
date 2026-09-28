import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SavomartStore, Property, Hotspot } from '../../types';

interface ChennaiMapProps {
  center?: [number, number];
  zoom?: number;
  stores?: SavomartStore[];
  properties?: Property[];
  hotspots?: Hotspot[];
  selectedLocation?: { lat: number; lon: number } | null;
  onMapClick?: (lat: number, lon: number) => void;
  onSelectProperty?: (property: Property) => void;
  className?: string;
}

export const ChennaiMap: React.FC<ChennaiMapProps> = ({
  center = [13.0827, 80.2707],
  zoom = 12,
  stores = [],
  properties = [],
  hotspots = [],
  selectedLocation,
  onMapClick,
  onSelectProperty,
  className = 'h-96'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]);

  // Update Markers
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;
    layerGroupRef.current.clearLayers();

    // 1. Render Savomart Operational Stores
    stores.forEach((store) => {
      const storeIcon = L.divIcon({
        className: 'custom-savo-store-pin',
        html: `
          <div style="background-color: #782B90; color: #FFF200; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid #FFF200; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">
            S
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([store.lat, store.lon], { icon: storeIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="color: #782B90; font-size: 14px;">${store.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Code: ${store.store_code}</span><br/>
          <p style="margin: 4px 0 6px 0; color: #334155;">${store.address || 'Operational Store'}</p>
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; background-color: #dcfce7; color: #166534;">
            Operational Savomart
          </span>
        </div>
      `);
      layerGroupRef.current?.addLayer(marker);
    });

    // 2. Render Scouted Properties
    properties.forEach((prop) => {
      const statusColors: Record<string, string> = {
        sighted: '#3b82f6',
        bd_review: '#8b5cf6',
        catchment_requested: '#f59e0b',
        catchment_completed: '#06b6d4',
        negotiation: '#ec4899',
        approved: '#10b981',
        rejected: '#ef4444',
      };
      const color = statusColors[prop.status] || '#64748b';

      const propIcon = L.divIcon({
        className: 'custom-property-pin',
        html: `
          <div style="background-color: ${color}; color: white; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 11px;">
            P
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([prop.lat, prop.lon], { icon: propIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="color: #1e293b; font-size: 14px;">${prop.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">${prop.code} • ${prop.pincode}</span><br/>
          <p style="margin: 4px 0; color: #475569;">${prop.address}</p>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <span style="padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; background-color: #f1f5f9; color: #334155; text-transform: uppercase;">
              ${prop.status.replace('_', ' ')}
            </span>
            ${prop.latest_evaluation ? `
              <span style="padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; background-color: #ede9fe; color: #5b21b6;">
                Score: ${prop.latest_evaluation.total_score}/100
              </span>
            ` : ''}
          </div>
        </div>
      `);
      if (onSelectProperty) {
        marker.on('click', () => onSelectProperty(prop));
      }
      layerGroupRef.current?.addLayer(marker);
    });

    // 3. Render Hotspots
    hotspots.forEach((h, index) => {
      const hotspotIcon = L.divIcon({
        className: 'custom-hotspot-pin',
        html: `
          <div style="background-color: #FFF200; color: #782B90; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; border: 3px solid #782B90; box-shadow: 0 4px 10px rgba(120,43,144,0.4); font-size: 13px; animation: pulse 2s infinite;">
            #${index + 1}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([h.lat, h.lon], { icon: hotspotIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="color: #782B90; font-size: 14px;">🔥 Hotspot #${index + 1}: ${h.name}</strong><br/>
          <span style="font-size: 12px; font-weight: 700; color: #0284c7;">Potential Score: ${h.score}/100</span><br/>
          <p style="margin: 4px 0 6px 0; color: #334155; font-size: 12px;">${h.rationale}</p>
        </div>
      `);
      layerGroupRef.current?.addLayer(marker);
    });

    // 4. Render User Clicked Location
    if (selectedLocation) {
      const pinIcon = L.divIcon({
        className: 'custom-pin-select',
        html: `
          <div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([selectedLocation.lat, selectedLocation.lon], { icon: pinIcon });
      layerGroupRef.current?.addLayer(marker);
    }
  }, [stores, properties, hotspots, selectedLocation]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-md border border-slate-200 text-xs z-[400] space-y-1.5 pointer-events-auto">
        <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Map Legend</div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-savo-purple border border-savo-yellow flex items-center justify-center text-[9px] text-savo-yellow font-bold">S</div>
          <span className="text-slate-600 font-medium">Operational Savomart</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded bg-blue-500 border border-white"></div>
          <span className="text-slate-600 font-medium">Scouted Property</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-savo-yellow border border-savo-purple"></div>
          <span className="text-slate-600 font-medium">Hotspot Recommendation</span>
        </div>
      </div>
    </div>
  );
};

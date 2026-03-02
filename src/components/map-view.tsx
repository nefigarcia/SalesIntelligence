"use client";

import { Business } from "@/app/page";
import { 
  Map, 
  AdvancedMarker, 
  Pin,
} from "@vis.gl/react-google-maps";
import { Navigation, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapViewProps {
  results: Business[];
  onMarkerClick: (b: Business) => void;
  selectedBusiness: Business | null;
  center: { lat: number; lng: number };
  zoom: number;
  onCenterChange: (center: { lat: number; lng: number }) => void;
  onZoomChange: (zoom: number) => void;
}

export function MapView({ 
  results, 
  onMarkerClick, 
  selectedBusiness, 
  center, 
  zoom, 
  onCenterChange, 
  onZoomChange 
}: MapViewProps) {
  return (
    <div className="absolute inset-0 bg-[#f8f9fa] overflow-hidden">
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={center}
        center={center}
        defaultZoom={zoom}
        zoom={zoom}
        mapId="DEMO_MAP_ID" 
        onZoomChanged={(e) => onZoomChange(e.detail.zoom)}
        onCenterChanged={(e) => onCenterChange(e.detail.center)}
        disableDefaultUI={true}
      >
        {results.map((b) => (
          <AdvancedMarker
            key={b.id}
            position={{ lat: b.lat, lng: b.lng }}
            onClick={() => onMarkerClick(b)}
          >
            <div className={cn(
              "transition-all transform hover:scale-110 cursor-pointer",
              selectedBusiness?.id === b.id ? "z-50 scale-125" : "z-10"
            )}>
              <Pin 
                background={selectedBusiness?.id === b.id ? '#247ECC' : '#EA4335'} 
                borderColor={'#ffffff'} 
                glyphColor={'#ffffff'}
                scale={selectedBusiness?.id === b.id ? 1.2 : 0.9}
              />
            </div>
          </AdvancedMarker>
        ))}
      </Map>

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
        <Button 
          variant="default" 
          size="icon" 
          className="h-12 w-12 md:h-10 md:w-10 rounded-lg shadow-xl bg-white text-foreground hover:bg-slate-50 border border-slate-200"
          onClick={() => {
            if (results.length > 0) {
              const avgLat = results.reduce((sum, b) => sum + b.lat, 0) / results.length;
              const avgLng = results.reduce((sum, b) => sum + b.lng, 0) / results.length;
              onCenterChange({ lat: avgLat, lng: avgLng });
              onZoomChange(12);
            }
          }}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      </div>

      {/* Map Branding */}
      <div className="absolute bottom-2 left-6 text-[10px] text-slate-500 font-bold z-40 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-200/50 flex items-center gap-3">
        <span className="flex items-center gap-1"><Info className="h-2.5 w-2.5" /> Live Places Data</span>
        <span className="opacity-50">|</span>
        <span>© 2025 Real Business Directory</span>
      </div>
    </div>
  );
}

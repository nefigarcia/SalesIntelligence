
"use client";

import { useState, useEffect } from "react";
import { Business } from "@/app/page";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin,
  useMap
} from "@vis.gl/react-google-maps";
import { Navigation, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapViewProps {
  results: Business[];
  onMarkerClick: (b: Business) => void;
  selectedBusiness: Business | null;
}

export function MapView({ results, onMarkerClick, selectedBusiness }: MapViewProps) {
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [zoom, setZoom] = useState(12);

  // Update map center when search results change
  useEffect(() => {
    if (results.length > 0) {
      setMapCenter({ lat: results[0].lat, lng: results[0].lng });
      setZoom(13);
    }
  }, [results]);

  // Update map center when a business is selected
  useEffect(() => {
    if (selectedBusiness) {
      setMapCenter({ lat: selectedBusiness.lat, lng: selectedBusiness.lng });
      setZoom(15);
    }
  }, [selectedBusiness]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-8 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <Compass className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Google Maps API Key Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To see the real interactive map, please add your Google Maps API Key to the .env file as:
          </p>
          <code className="block bg-slate-50 p-2 rounded text-xs font-mono mb-4">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
          </code>
          <p className="text-xs text-muted-foreground">
            You can get a key from the Google Cloud Console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#f8f9fa] overflow-hidden">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={mapCenter}
          center={mapCenter}
          defaultZoom={zoom}
          zoom={zoom}
          mapId="bf50473b272551" // Required for Advanced Markers
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          onCenterChanged={(e) => setMapCenter(e.detail.center)}
          disableDefaultUI={true}
        >
          {results.map((b) => (
            <AdvancedMarker
              key={b.id}
              position={{ lat: b.lat, lng: b.lng }}
              onClick={() => onMarkerClick(b)}
            >
              <div className={cn(
                "transition-all transform hover:scale-110",
                selectedBusiness?.id === b.id ? "z-50 scale-125" : "z-10"
              )}>
                <Pin 
                  background={selectedBusiness?.id === b.id ? '#247ECC' : '#4DDBDB'} 
                  borderColor={'#ffffff'} 
                  glyphColor={'#ffffff'}
                  scale={selectedBusiness?.id === b.id ? 1.2 : 1}
                />
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
        <Button 
          variant="default" 
          size="icon" 
          className="h-10 w-10 rounded-lg shadow-xl bg-white text-foreground hover:bg-slate-50 border"
          onClick={() => {
            if (results.length > 0) {
              setMapCenter({ lat: results[0].lat, lng: results[0].lng });
              setZoom(13);
            }
          }}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      </div>

      {/* Map Branding Simulation */}
      <div className="absolute bottom-2 left-6 text-[10px] text-slate-700 font-bold z-40 bg-white/70 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-4">
        <span>© 2025 ClientsFinding Real-time Data</span>
        <div className="flex items-center gap-1">
          <div className="w-10 h-0.5 bg-slate-400" />
          <span>Google Maps Platform</span>
        </div>
      </div>
    </div>
  );
}

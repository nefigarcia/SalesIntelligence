
"use client";

import { useState, useEffect } from "react";
import { Business } from "@/app/page";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin,
} from "@vis.gl/react-google-maps";
import { Navigation, Compass, Info } from "lucide-react";
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
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 text-center overflow-auto">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg border border-slate-100">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-slate-900">Google Maps Integration Required</h3>
          <p className="text-slate-600 mb-6 leading-relaxed">
            To view the live interactive map and business markers, you need to provide a Google Maps API Key in your environment configuration.
          </p>
          
          <div className="bg-slate-50 p-6 rounded-2xl text-left space-y-4 mb-6 border border-slate-100">
            <div className="flex gap-3">
              <div className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <p className="text-sm text-slate-700">Enable <b>Maps JavaScript API</b> in Google Cloud Console.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <p className="text-sm text-slate-700">Create an API Key and add it to <code>.env</code> as:<br/>
                <code className="text-[11px] bg-white px-2 py-1 rounded border border-slate-200 mt-2 block font-mono text-primary">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
                </code>
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
              <p className="text-sm text-slate-700">Create a <b>Map ID</b> for Advanced Markers and update the code.</p>
            </div>
          </div>
          
          <Button 
            className="w-full rounded-xl py-6 font-bold"
            onClick={() => window.open('https://console.cloud.google.com/google/maps-apis/credentials', '_blank')}
          >
            Go to Cloud Console
          </Button>
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
          mapId="DEMO_MAP_ID" // Replace with your actual Map ID from Google Console
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
                "transition-all transform hover:scale-110 cursor-pointer",
                selectedBusiness?.id === b.id ? "z-50 scale-125" : "z-10"
              )}>
                <Pin 
                  background={selectedBusiness?.id === b.id ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} 
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
          className="h-10 w-10 rounded-lg shadow-xl bg-white text-foreground hover:bg-slate-50 border border-slate-200"
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

      {/* Map Branding */}
      <div className="absolute bottom-2 left-6 text-[10px] text-slate-500 font-bold z-40 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-200/50 flex items-center gap-3">
        <span className="flex items-center gap-1"><Info className="h-2.5 w-2.5" /> Interactive Lead Map</span>
        <span className="opacity-50">|</span>
        <span>© 2025 ClientsFinding Data</span>
      </div>
    </div>
  );
}

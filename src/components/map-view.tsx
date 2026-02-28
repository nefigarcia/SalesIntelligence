
"use client";

import { useState, useEffect } from "react";
import { Business } from "@/app/page";
import { MapPin, ZoomIn, ZoomOut, Navigation, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface MapViewProps {
  results: Business[];
  onMarkerClick: (b: Business) => void;
  selectedBusiness: Business | null;
}

export function MapView({ results, onMarkerClick, selectedBusiness }: MapViewProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMapLoaded(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Helper to generate semi-random but consistent positions for mock markers
  const getMarkerPosition = (idx: number) => {
    // These values are derived from index to keep them consistent for the same result set
    const positions = [
      { left: '35%', top: '45%' },
      { left: '55%', top: '30%' },
      { left: '65%', top: '60%' },
      { left: '42%', top: '75%' },
      { left: '25%', top: '55%' },
    ];
    return positions[idx % positions.length];
  };

  return (
    <div className="absolute inset-0 bg-[#f8f9fa] overflow-hidden">
      {/* Real Map Placeholder Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://picsum.photos/seed/nyc-map-aerial/1200/800" 
          alt="Map Background"
          fill
          className={cn("object-cover transition-opacity duration-1000", isMapLoaded ? "opacity-100" : "opacity-0")}
          data-ai-hint="city map"
        />
        {/* Overlay grid for that "digital map" feel */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)", 
               backgroundSize: "40px 40px" 
             }}>
        </div>
        {/* Subtle radial gradient to focus on center */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/5 pointer-events-none" />
      </div>

      {/* Markers Simulation */}
      <div className="relative w-full h-full z-10">
        {!isMapLoaded ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-slate-50/90 backdrop-blur-sm">
            <Compass className="h-12 w-12 text-primary/40 animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-bold text-primary/60">Rendering Map...</span>
              <span className="text-xs text-muted-foreground animate-pulse">Syncing location data</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {results.map((b, idx) => {
              const pos = getMarkerPosition(idx);
              return (
                <button
                  key={b.id}
                  onClick={() => onMarkerClick(b)}
                  style={{ 
                    left: pos.left, 
                    top: pos.top 
                  }}
                  className={cn(
                    "absolute flex flex-col items-center group transition-all duration-300 hover:scale-110 active:scale-95 animate-in fade-in zoom-in-50 duration-500",
                    selectedBusiness?.id === b.id ? "z-30" : "z-20"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-xl border-2 transition-all transform -translate-y-2 group-hover:-translate-y-4",
                    selectedBusiness?.id === b.id ? "border-primary scale-110 ring-4 ring-primary/20" : "border-transparent"
                  )}>
                    <MapPin className={cn("h-4 w-4", selectedBusiness?.id === b.id ? "text-primary" : "text-secondary")} />
                    <span className="text-xs font-bold whitespace-nowrap">{b.name}</span>
                  </div>
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 border-white shadow-lg",
                    selectedBusiness?.id === b.id ? "bg-primary scale-125" : "bg-secondary"
                  )} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
        <div className="flex flex-col bg-white rounded-lg shadow-xl border overflow-hidden">
          <Button variant="ghost" size="icon" className="h-10 w-10 border-b rounded-none hover:bg-slate-50"><ZoomIn className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none hover:bg-slate-50"><ZoomOut className="h-5 w-5" /></Button>
        </div>
        <Button variant="default" size="icon" className="h-10 w-10 rounded-lg shadow-xl bg-white text-foreground hover:bg-slate-50 border">
          <Navigation className="h-5 w-5" />
        </Button>
      </div>

      {/* Map Branding Simulation */}
      <div className="absolute bottom-2 left-6 text-[10px] text-slate-700 font-bold z-40 bg-white/70 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-4">
        <span>© 2025 ClientsFinding Map Data</span>
        <div className="flex items-center gap-1">
          <div className="w-10 h-0.5 bg-slate-400" />
          <span>500 m</span>
        </div>
      </div>
    </div>
  );
}

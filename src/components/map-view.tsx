
"use client";

import { useState, useEffect } from "react";
import { Business } from "@/app/page";
import { MapPin, ZoomIn, ZoomOut, Navigation, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapViewProps {
  results: Business[];
  onMarkerClick: (b: Business) => void;
  selectedBusiness: Business | null;
}

export function MapView({ results, onMarkerClick, selectedBusiness }: MapViewProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 bg-[#E5E3DF] overflow-hidden map-gradient">
      {/* Decorative Grid Patterns for "Map Look" */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: "linear-gradient(#247ECC 1px, transparent 1px), linear-gradient(90deg, #247ECC 1px, transparent 1px)", 
             backgroundSize: "100px 100px" 
           }}>
      </div>
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: "linear-gradient(#247ECC 1px, transparent 1px), linear-gradient(90deg, #247ECC 1px, transparent 1px)", 
             backgroundSize: "20px 20px" 
           }}>
      </div>

      {/* Markers Simulation */}
      <div className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-in-out">
        {!isMapLoaded ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Compass className="h-12 w-12 text-primary/40 animate-spin" />
            <span className="text-sm font-medium text-primary/60">Initialising Map...</span>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {results.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => onMarkerClick(b)}
                style={{ 
                  left: `${20 + (idx * 15)}%`, 
                  top: `${30 + (idx * 20)}%` 
                }}
                className={cn(
                  "absolute flex flex-col items-center group transition-all duration-300 hover:scale-110 active:scale-95",
                  selectedBusiness?.id === b.id ? "z-30" : "z-20"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg border-2 transition-all transform -translate-y-2 group-hover:-translate-y-4",
                  selectedBusiness?.id === b.id ? "border-primary scale-110 ring-4 ring-primary/20" : "border-transparent"
                )}>
                  <MapPin className={cn("h-4 w-4", selectedBusiness?.id === b.id ? "text-primary" : "text-secondary")} />
                  <span className="text-xs font-bold whitespace-nowrap">{b.name}</span>
                </div>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                  selectedBusiness?.id === b.id ? "bg-primary scale-125" : "bg-secondary"
                )} />
              </button>
            ))}
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
      <div className="absolute bottom-2 left-6 text-[10px] text-muted-foreground flex items-center gap-4">
        <span>© 2025 ClientsFinding Map Data</span>
        <div className="flex items-center gap-1">
          <div className="w-10 h-0.5 bg-muted" />
          <span>100 km</span>
        </div>
      </div>
    </div>
  );
}

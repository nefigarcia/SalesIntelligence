"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchHeader } from "@/components/search-header";
import { MapView } from "@/components/map-view";
import { BusinessList } from "@/components/business-list";
import { BusinessDetail } from "@/components/business-detail";
import { SavedLeadsView } from "@/components/saved-leads-view";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogIn, Search as SearchIcon, RefreshCcw } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export type Business = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
};

export type ViewState = "search" | "lists" | "analytics";

export default function Dashboard() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<ViewState>("search");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  
  // Map State from URL or Defaults
  const [mapCenter, setMapCenter] = useState({ 
    lat: parseFloat(searchParams.get("lat") || "40.7128"), 
    lng: parseFloat(searchParams.get("lng") || "-74.0060") 
  });
  const [zoom, setZoom] = useState(parseInt(searchParams.get("z") || "12"));
  const initialSearchPerformed = useRef(false);

  // Sync URL with Map State (Throttled)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", mapCenter.lat.toFixed(6));
    params.set("lng", mapCenter.lng.toFixed(6));
    params.set("z", zoom.toString());
    
    // Use replace to avoid bloating history during pans
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [mapCenter, zoom, pathname, searchParams]);

  const handleSearch = useCallback((fullQuery: string, useCurrentView = false) => {
    setActiveView("search");
    setIsSearching(true);
    setSelectedBusiness(null);
    setShowSearchThisArea(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", fullQuery);
    router.replace(`${pathname}?${params.toString()}`);
    
    // Simulate finding businesses
    setTimeout(() => {
      const seed = Date.now();
      let searchTerm = fullQuery;
      let targetLat = mapCenter.lat;
      let targetLng = mapCenter.lng;
      let shouldMoveMap = false;

      // Logic for "in/near" location parsing
      if (!useCurrentView) {
        const inMatch = fullQuery.toLowerCase().split(/\s+in\s+/);
        const nearMatch = fullQuery.toLowerCase().split(/\s+near\s+/);
        
        if (inMatch.length > 1 || nearMatch.length > 1) {
          const locationName = (inMatch[1] || nearMatch[1]).trim();
          searchTerm = (inMatch[0] || nearMatch[0]).trim();
          shouldMoveMap = true;

          const locLower = locationName.toLowerCase();
          if (locLower.includes("utah") || locLower.includes("salt lake")) {
            targetLat = 40.7608; targetLng = -111.8910;
          } else if (locLower.includes("california") || locLower.includes("la")) {
            targetLat = 34.0522; targetLng = -118.2437;
          } else if (locLower.includes("texas") || locLower.includes("austin")) {
            targetLat = 30.2672; targetLng = -97.7431;
          } else if (locLower.includes("nevada") || locLower.includes("las vegas")) {
            targetLat = 36.1716; targetLng = -115.1391;
          }
          
          setMapCenter({ lat: targetLat, lng: targetLng });
          setZoom(13);
        }
      }

      const mockResults: Business[] = Array.from({ length: 12 }).map((_, i) => ({
        id: `b-${seed}-${i}`,
        name: `${['Elite', 'Premium', 'Star', 'Global', 'Local', 'Pro', 'Apex', 'Direct'][i % 8]} ${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} ${i + 1}`,
        category: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1) || "Business",
        address: `${100 + i * 25} Main St, Region`,
        phone: `(555) ${100 + i}-${2000 + i}`,
        email: `contact@${searchTerm.toLowerCase().replace(/\s/g, '')}${i}@example.com`,
        website: `https://www.${searchTerm.toLowerCase().replace(/\s/g, '')}${i}.com`,
        rating: 4.0 + Math.random(),
        reviews: 20 + Math.floor(Math.random() * 200),
        lat: targetLat + (Math.random() - 0.5) * 0.05,
        lng: targetLng + (Math.random() - 0.5) * 0.05,
      }));

      setSearchResults(mockResults);
      setIsSearching(false);
      
      if (!useCurrentView) {
        toast({
          title: "Search Complete",
          description: `Found ${mockResults.length} results for "${searchTerm}".`,
        });
      }
    }, 800);
  }, [mapCenter, searchParams, router, pathname, toast]);

  // Handle Initial Search from URL
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && !initialSearchPerformed.current && user) {
      initialSearchPerformed.current = true;
      handleSearch(queryParam);
    }
  }, [searchParams, user, handleSearch]);

  const handleSignIn = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Auth Error:", error);
    }
  };

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8">
          <SearchIcon className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-4 tracking-tight text-foreground">Welcome to ClientsFinding</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          The smart B2B lead generation tool. Sign in to start finding and managing local business leads.
        </p>
        <Button onClick={handleSignIn} size="lg" className="rounded-full px-8 py-6 text-lg font-semibold gap-2">
          <LogIn className="h-5 w-5" /> Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-body">
        <AppSidebar 
          activeView={activeView} 
          onViewChange={(view, listId) => {
            setActiveView(view);
            if (listId !== undefined) setSelectedListId(listId);
            setSelectedBusiness(null);
          }} 
        />
        <SidebarInset className="flex flex-col h-screen">
          <header className="flex h-20 shrink-0 items-center border-b px-6 bg-white shadow-sm z-20">
            <SearchHeader 
              onSearch={handleSearch} 
              isLoading={isSearching} 
              initialValue={searchParams.get("q") || ""} 
            />
          </header>
          
          <main className="flex-1 flex flex-row overflow-hidden relative">
            {activeView === "search" ? (
              <>
                <div className="flex-1 relative h-full">
                  <MapView 
                    results={searchResults} 
                    onMarkerClick={(b) => setSelectedBusiness(b)} 
                    selectedBusiness={selectedBusiness}
                    center={mapCenter}
                    zoom={zoom}
                    onCenterChange={(c) => {
                      setMapCenter(c);
                      setShowSearchThisArea(true);
                    }}
                    onZoomChange={(z) => {
                      setZoom(z);
                      setShowSearchThisArea(true);
                    }}
                  />
                  
                  {showSearchThisArea && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                      <Button 
                        onClick={() => handleSearch(searchParams.get("q") || "Business", true)}
                        className="bg-white text-primary hover:bg-slate-50 border shadow-xl rounded-full px-6 py-5 font-bold gap-2 animate-in fade-in slide-in-from-top-4"
                      >
                        <RefreshCcw className={cn("h-4 w-4", isSearching && "animate-spin")} />
                        Search this area
                      </Button>
                    </div>
                  )}
                </div>

                <div className="w-96 border-l bg-white flex flex-col shrink-0 z-10 shadow-lg">
                  {selectedBusiness ? (
                    <BusinessDetail 
                      business={selectedBusiness} 
                      onClose={() => setSelectedBusiness(null)} 
                    />
                  ) : (
                    <BusinessList 
                      results={searchResults} 
                      isLoading={isSearching}
                      onSelect={(b) => setSelectedBusiness(b)}
                    />
                  )}
                </div>
              </>
            ) : activeView === "lists" ? (
              <SavedLeadsView listId={selectedListId} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Analytics dashboard coming soon.
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchHeader } from "@/components/search-header";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MapView } from "@/components/map-view";
import { BusinessList } from "@/components/business-list";
import { BusinessDetail } from "@/components/business-detail";
import { SavedLeadsView } from "@/components/saved-leads-view";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogIn, Search as SearchIcon, RefreshCcw, Compass } from "lucide-react";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { APIProvider, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

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

function DashboardContent() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const map = useMap();
  const placesLibrary = useMapsLibrary("places");

  const [activeView, setActiveView] = useState<ViewState>("search");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  
  const [mapCenter, setMapCenter] = useState({ 
    lat: parseFloat(searchParams.get("lat") || "40.7128"), 
    lng: parseFloat(searchParams.get("lng") || "-74.0060") 
  });
  const [zoom, setZoom] = useState(parseInt(searchParams.get("z") || "12"));
  const initialSearchPerformed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", mapCenter.lat.toFixed(6));
    params.set("lng", mapCenter.lng.toFixed(6));
    params.set("z", zoom.toString());
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [mapCenter, zoom, pathname, searchParams]);

  const handleSearch = useCallback((fullQuery: string, useCurrentView = false) => {
    if (!placesLibrary || !map) {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        toast({
          variant: "destructive",
          title: "API Key Required",
          description: "Please configure your Google Maps API Key to use real search.",
        });
      }
      return;
    }

    setActiveView("search");
    setIsSearching(true);
    setSelectedBusiness(null);
    setShowSearchThisArea(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", fullQuery);
    router.replace(`${pathname}?${params.toString()}`);

    const service = new placesLibrary.PlacesService(map);
    
    const request: google.maps.places.TextSearchRequest = {
      query: fullQuery,
      location: useCurrentView ? map.getCenter() : undefined,
      bounds: useCurrentView ? map.getBounds() : undefined,
    };

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const businesses: Business[] = results.map((place) => ({
          id: place.place_id || Math.random().toString(),
          name: place.name || "Unknown Business",
          category: place.types?.[0]?.replace(/_/g, " ") || "Business",
          address: place.formatted_address || "No address available",
          phone: "Loading phone...", 
          rating: place.rating || 0,
          reviews: place.user_ratings_total || 0,
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          website: "",
        }));

        setSearchResults(businesses);
        
        if (!useCurrentView && businesses.length > 0) {
          const firstResult = businesses[0];
          setMapCenter({ lat: firstResult.lat, lng: firstResult.lng });
          setZoom(13);
        }

        // Deep enrich the results with Details (Phone/Website)
        results.forEach((place, index) => {
          if (!place.place_id) return;
          
          // Stagger requests slightly to be nice to rate limits
          setTimeout(() => {
            service.getDetails({
              placeId: place.place_id!,
              fields: ['formatted_phone_number', 'website']
            }, (detail, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && detail) {
                setSearchResults(prev => prev.map(b => 
                  b.id === place.place_id 
                    ? { 
                        ...b, 
                        phone: detail.formatted_phone_number || "No phone listed", 
                        website: detail.website || "" 
                      } 
                    : b
                ));
              }
            });
          }, index * 150);
        });

        toast({
          title: "Search Complete",
          description: `Found ${businesses.length} businesses. Fetching details...`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: "Could not retrieve real business data at this time.",
        });
      }
      setIsSearching(false);
    });
  }, [placesLibrary, map, searchParams, router, pathname, toast]);

  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && !initialSearchPerformed.current && user && placesLibrary && map) {
      initialSearchPerformed.current = true;
      handleSearch(queryParam);
    }
  }, [searchParams, user, handleSearch, placesLibrary, map]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-body">
        <AppSidebar 
          activeView={activeView} 
          selectedListId={selectedListId}
          onViewChange={(view, listId) => {
            setActiveView(view);
            if (listId !== undefined) setSelectedListId(listId);
            setSelectedBusiness(null);
          }} 
        />
        <SidebarInset className="flex flex-col h-screen">
          <header className="flex h-20 shrink-0 items-center border-b px-6 bg-white shadow-sm z-20">
            <div className="flex items-center gap-3 mr-3">
              {/* Mobile sidebar trigger */}
              <SidebarTrigger className="md:hidden" />
            </div>
            <div className="flex-1">
              <SearchHeader 
                onSearch={handleSearch} 
                isLoading={isSearching} 
                initialValue={searchParams.get("q") || ""} 
              />
            </div>
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

export default function Dashboard() {
  const { user, isUserLoading: userLoading } = useUser();
  const auth = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const isMobile = useIsMobile();

  const handleSignIn = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Use redirect on mobile devices to avoid popup issues on mobile browsers.
      if (isMobile) {
        // signInWithRedirect will navigate away and return via Firebase auth state listener
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
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
          The smart B2B lead generation tool. Sign in to start finding and managing real local business leads.
        </p>
        <Button onClick={handleSignIn} size="lg" className="rounded-full px-8 py-6 text-lg font-semibold gap-2">
          <LogIn className="h-5 w-5" /> Sign in with Google
        </Button>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-8 text-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-xl border border-slate-100 animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Compass className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-3xl font-black mb-6 text-slate-900 tracking-tight">Google Maps Integration Required</h3>
          <p className="text-slate-600 mb-8 leading-relaxed text-lg font-medium">
            To search for real businesses and view them on the map, you need to provide a Google Maps API Key.
          </p>
          
          <div className="bg-slate-50 p-8 rounded-3xl text-left space-y-5 mb-8 border border-slate-100">
            <div className="flex gap-4">
              <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5">1</div>
              <p className="text-base text-slate-700 font-semibold">Enable <b>Maps JavaScript API</b> and <b>Places API</b> in Google Cloud.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 mt-0.5">2</div>
              <p className="text-base text-slate-700 font-semibold">Add your key to <code>.env</code> as:<br/>
                <code className="text-[12px] bg-white px-3 py-2 rounded-xl border border-slate-200 mt-3 block font-mono text-primary shadow-sm">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
                </code>
              </p>
            </div>
          </div>
          
          <Button 
            className="w-full rounded-2xl py-8 text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
            onClick={() => window.open('https://console.cloud.google.com/google/maps-apis/credentials', '_blank')}
          >
            Open Google Cloud Console
          </Button>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <DashboardContent />
    </APIProvider>
  );
}

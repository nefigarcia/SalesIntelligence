"use client";

import { useState } from "react";
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
import { LogIn, Search as SearchIcon } from "lucide-react";
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
  const [activeView, setActiveView] = useState<ViewState>("search");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async () => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Auth Not Initialized",
        description: "Firebase Authentication is not ready. Check your .env config.",
      });
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google.",
      });
    } catch (error: any) {
      console.error("Auth Error:", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message || "Please check your Firebase Console settings.",
      });
    }
  };

  const handleSearch = (query: string, location: string) => {
    setActiveView("search");
    setIsSearching(true);
    setSelectedBusiness(null); 
    
    // Simulate finding multiple businesses across the area
    setTimeout(() => {
      const seed = Date.now();
      
      // Basic Geocoding simulation
      let baseLat = 40.7128; // Default NYC
      let baseLng = -74.0060;

      const locLower = location.toLowerCase();
      if (locLower.includes("utah") || locLower.includes("salt lake") || locLower.includes("slc")) {
        baseLat = 40.7608;
        baseLng = -111.8910;
      } else if (locLower.includes("california") || locLower.includes("los angeles") || locLower.includes("la")) {
        baseLat = 34.0522;
        baseLng = -118.2437;
      } else if (locLower.includes("texas") || locLower.includes("austin")) {
        baseLat = 30.2672;
        baseLng = -97.7431;
      } else if (locLower.includes("florida") || locLower.includes("miami")) {
        baseLat = 25.7617;
        baseLng = -80.1918;
      } else if (location.length > 0 && !locLower.includes("new york")) {
        // Randomize slightly for unknown locations so it doesn't always show NYC
        baseLat = 35 + Math.random() * 10;
        baseLng = -100 + Math.random() * 20;
      }
      
      const mockResults: Business[] = Array.from({ length: 8 }).map((_, i) => ({
        id: `b-${seed}-${i}`,
        name: i === 0 ? `${query} Pro ${location.split(',')[0]}` : `${['Elite', 'Premium', 'Star', 'Global', 'Local'][i % 5]} ${query} ${i + 1}`,
        category: query || "Business",
        address: `${100 + i * 25} Main St, ${location}`,
        phone: `(555) ${100 + i}-${2000 + i}`,
        email: `contact@${query.toLowerCase().replace(/\s/g, '')}${i}@example.com`,
        website: `https://www.${query.toLowerCase().replace(/\s/g, '')}${i}.com`,
        rating: 4.0 + Math.random(),
        reviews: 20 + Math.floor(Math.random() * 200),
        lat: baseLat + (Math.random() - 0.5) * 0.05, // Closer scatter
        lng: baseLng + (Math.random() - 0.5) * 0.05,
      }));

      setSearchResults(mockResults);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} leads for "${query}" in ${location}.`,
      });
    }, 1000);
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
          <header className="flex h-16 shrink-0 items-center border-b px-6 bg-white shadow-sm z-20">
            <SearchHeader onSearch={handleSearch} isLoading={isSearching} />
          </header>
          
          <main className="flex-1 flex flex-row overflow-hidden relative">
            {activeView === "search" ? (
              <>
                <div className="flex-1 relative h-full">
                  <MapView 
                    results={searchResults} 
                    onMarkerClick={(b) => setSelectedBusiness(b)} 
                    selectedBusiness={selectedBusiness}
                  />
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

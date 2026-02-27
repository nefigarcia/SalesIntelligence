
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
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  website?: string;
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
        description: error.message || "Please check your Firebase Console settings (Google Auth & Authorized Domains).",
      });
    }
  };

  const handleSearch = (query: string, location: string) => {
    setActiveView("search");
    setIsSearching(true);
    setSelectedBusiness(null); // Clear selection on new search to avoid confusion
    
    // Simulate API call for local business search with dynamic data
    setTimeout(() => {
      const seed = Date.now();
      const mockResults: Business[] = [
        {
          id: `b-${seed}-1`,
          name: `${query || "Premium"} ${location.split(',')[0]} Services`,
          category: query || "Professional Service",
          address: `123 North St, ${location}`,
          phone: "(555) 123-4567",
          rating: 4.8,
          reviews: 124,
          lat: 40.7128 + (Math.random() - 0.5) * 0.05,
          lng: -74.006 + (Math.random() - 0.5) * 0.05,
          website: "https://example.com"
        },
        {
          id: `b-${seed}-2`,
          name: `Elite ${query || "Business"} Group`,
          category: query || "Local Business",
          address: `456 Central Ave, ${location}`,
          phone: "(555) 987-6543",
          rating: 4.5,
          reviews: 89,
          lat: 40.7306 + (Math.random() - 0.5) * 0.05,
          lng: -73.9352 + (Math.random() - 0.5) * 0.05,
          website: "https://example.com"
        },
        {
          id: `b-${seed}-3`,
          name: `${location.split(',')[0]} ${query || "Specialist"} Hub`,
          category: query || "Specialist",
          address: `789 South Blvd, ${location}`,
          phone: "(555) 456-7890",
          rating: 4.2,
          reviews: 56,
          lat: 40.7589 + (Math.random() - 0.5) * 0.05,
          lng: -73.9851 + (Math.random() - 0.5) * 0.05,
          website: "https://example.com"
        },
      ];
      setSearchResults(mockResults);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} leads for "${query}" in ${location}.`,
      });
    }, 1200);
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

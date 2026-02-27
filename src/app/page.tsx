
"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchHeader } from "@/components/search-header";
import { MapView } from "@/components/map-view";
import { BusinessList } from "@/components/business-list";
import { BusinessDetail } from "@/components/business-detail";
import { useToast } from "@/hooks/use-toast";

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

export default function Dashboard() {
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = (query: string, location: string) => {
    setIsSearching(true);
    // Simulate API call for local business search
    setTimeout(() => {
      const mockResults: Business[] = [
        {
          id: "1",
          name: "Blue Ribbon Plumbing",
          category: "Plumber",
          address: "123 Water St, New York, NY",
          phone: "(555) 123-4567",
          rating: 4.8,
          reviews: 124,
          lat: 40.7128,
          lng: -74.006,
          website: "https://example.com"
        },
        {
          id: "2",
          name: "Gotham Dental Care",
          category: "Dentist",
          address: "456 Smile Ave, New York, NY",
          phone: "(555) 987-6543",
          rating: 4.5,
          reviews: 89,
          lat: 40.7306,
          lng: -73.9352,
          website: "https://example.com"
        },
        {
          id: "3",
          name: "Apex Auto Repair",
          category: "Auto Service",
          address: "789 Engine Blvd, New York, NY",
          phone: "(555) 456-7890",
          rating: 4.2,
          reviews: 56,
          lat: 40.7589,
          lng: -73.9851,
          website: "https://example.com"
        },
      ];
      setSearchResults(mockResults);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} businesses in ${location}.`,
      });
    }, 1200);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-body">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          <header className="flex h-16 shrink-0 items-center border-b px-6 bg-white shadow-sm z-20">
            <SearchHeader onSearch={handleSearch} isLoading={isSearching} />
          </header>
          <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* Main Interactive Map */}
            <div className="flex-1 relative h-full">
              <MapView 
                results={searchResults} 
                onMarkerClick={(b) => setSelectedBusiness(b)} 
                selectedBusiness={selectedBusiness}
              />
            </div>

            {/* Side Results Panel */}
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
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

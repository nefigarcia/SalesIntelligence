
"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchHeader({ onSearch, isLoading }: SearchHeaderProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    onSearch(query);
  };

  return (
    <div className="flex w-full items-center gap-4 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-12 h-12 w-full border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-full bg-slate-50 text-base shadow-sm" 
            placeholder="Search for businesses (e.g. Plumbers in Utah)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          className="h-12 px-8 font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
        </Button>
      </form>
    </div>
  );
}

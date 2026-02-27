
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { smartSearchSuggestions } from "@/ai/flows/smart-search-suggestions";
import { cn } from "@/lib/utils";

interface SearchHeaderProps {
  onSearch: (query: string, location: string) => void;
  isLoading?: boolean;
}

export function SearchHeader({ onSearch, isLoading }: SearchHeaderProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("New York, NY");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 2) {
      setIsSuggesting(true);
      try {
        const { suggestions } = await smartSearchSuggestions({ query: val });
        setSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
      } finally {
        setIsSuggesting(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(query, location);
    setShowSuggestions(false);
  };

  return (
    <div className="flex w-full items-center gap-4 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2 relative">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-10 h-11 w-full border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-full bg-slate-50" 
            placeholder="Type of business (e.g. Plumber, Dentist)"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query.length > 2 && setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2"
            >
              <div className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-secondary" /> Smart Suggestions
              </div>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                >
                  <span className="text-sm font-medium">{s}</span>
                  <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 text-secondary transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-1 group">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-10 h-11 border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-full bg-slate-50" 
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !query}
          className="h-11 px-8 font-semibold rounded-full bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Leads"}
        </Button>
      </form>
    </div>
  );
}

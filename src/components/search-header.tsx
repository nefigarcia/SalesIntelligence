"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PLACEHOLDERS = [
  "Dentists in Chicago, IL",
  "Plumbers in Austin, TX",
  "Hair salons in Miami, FL",
  "Restaurants in New York, NY",
  "Auto repair in Dallas, TX",
  "HVAC contractors in Phoenix, AZ",
];

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

export function SearchHeader({ onSearch, isLoading, initialValue = "" }: SearchHeaderProps) {
  const [query, setQuery] = useState(initialValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(initialValue); }, [initialValue]);

  // Cycle placeholder text
  useEffect(() => {
    if (query) return;
    const id = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [query]);

  // Ctrl+K / Cmd+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          className="pl-10 pr-20 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl bg-white text-sm shadow-sm transition-all"
          placeholder={PLACEHOLDERS[placeholderIndex]}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-400 font-mono pointer-events-none">
            ⌘K
          </kbd>
        )}
      </div>
      <Button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="h-10 px-5 font-semibold rounded-xl shrink-0 shadow-sm"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </Button>
    </form>
  );
}

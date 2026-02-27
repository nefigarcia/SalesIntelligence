"use client";

import { Business } from "@/app/page";
import { Star, MapPin, Phone, ArrowRight, MousePointer2, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessListProps {
  results: Business[];
  isLoading?: boolean;
  onSelect: (b: Business) => void;
}

export function BusinessList({ results, isLoading, onSelect }: BusinessListProps) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-3 p-4 border rounded-xl">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-12 text-center bg-slate-50/30">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <MousePointer2 className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold mb-2">Ready to find clients?</h3>
        <p className="text-sm text-muted-foreground">
          Enter a business type and location to search for local leads.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b shrink-0 bg-slate-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Search Results
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
            {results.length} Found
          </Badge>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Click on a business to view details or save it.
        </p>
      </div>
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-4 space-y-3">
          {results.map((b) => (
            <div 
              key={b.id} 
              onClick={() => onSelect(b)}
              className="group border-2 border-transparent hover:border-primary/20 hover:bg-slate-50 p-4 rounded-xl cursor-pointer transition-all shadow-sm bg-white"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate pr-2">
                  {b.name}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold">{b.rating}</span>
                </div>
              </div>
              
              <div className="space-y-1.5 mb-4">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <span className="line-clamp-1">{b.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{b.phone}</span>
                </div>
                {b.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{b.email}</span>
                  </div>
                )}
                {b.website && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{b.website.replace(/^https?:\/\//, '')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Badge variant="outline" className="font-normal text-[10px] text-muted-foreground border-slate-200">
                  {b.category}
                </Badge>
                <div className="text-primary text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Detail <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

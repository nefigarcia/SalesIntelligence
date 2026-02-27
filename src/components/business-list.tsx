"use client";

import { useState, useMemo } from "react";
import { Business } from "@/app/page";
import { Star, MapPin, Phone, ArrowRight, MousePointer2, Globe, Mail, CheckCircle2, Loader2, PlusCircle, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, increment, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BusinessListProps {
  results: Business[];
  isLoading?: boolean;
  onSelect: (b: Business) => void;
}

export function BusinessList({ results, isLoading, onSelect }: BusinessListProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "leadLists");
  }, [db, user]);

  const { data: userLists } = useCollection(listsQuery);

  const allSelected = results.length > 0 && selectedIds.length === results.length;
  const isAnySelected = selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((b) => b.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkSave = async (listId: string = "general", listName: string = "General Leads") => {
    if (!db || !user || selectedIds.length === 0) return;

    setIsBulkSaving(true);
    const selectedBusinesses = results.filter((b) => selectedIds.includes(b.id));
    const listRef = doc(db, "users", user.uid, "leadLists", listId);

    try {
      await runTransaction(db, async (transaction) => {
        const listDoc = await transaction.get(listRef);
        
        // Update list metadata
        if (!listDoc.exists()) {
          transaction.set(listRef, {
            id: listId,
            name: listName,
            userId: user.uid,
            count: selectedBusinesses.length,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          transaction.update(listRef, {
            count: increment(selectedBusinesses.length),
            updatedAt: serverTimestamp()
          });
        }
        
        // Save each selected lead
        selectedBusinesses.forEach((business) => {
          const leadRef = doc(db, "users", user.uid, "leadLists", listId, "leads", business.id);
          transaction.set(leadRef, {
            id: business.id,
            name: business.name,
            address: business.address,
            phoneNumber: business.phone,
            category: business.category,
            rating: business.rating,
            reviews: business.reviews,
            website: business.website || "",
            email: business.email || "",
            savedAt: serverTimestamp(),
          });
        });
      });

      toast({
        title: "Leads Saved",
        description: `Saved ${selectedBusinesses.length} leads to "${listName}".`,
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Bulk save error:", err);
      const permissionError = new FirestorePermissionError({
        path: listRef.path,
        operation: 'write',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsBulkSaving(false);
    }
  };

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
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="p-6 border-b shrink-0 bg-slate-50/50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Search Results
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
              {results.length} Found
            </Badge>
          </h2>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200/60">
          <Checkbox 
            id="select-all" 
            checked={allSelected} 
            onCheckedChange={toggleSelectAll}
            className="rounded-sm border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label 
            htmlFor="select-all" 
            className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
          >
            Select All Results
          </label>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-4 space-y-3 pb-24">
          {results.map((b) => (
            <div 
              key={b.id} 
              onClick={() => onSelect(b)}
              className={cn(
                "group border-2 p-4 rounded-xl cursor-pointer transition-all shadow-sm bg-white relative flex gap-3",
                selectedIds.includes(b.id) ? "border-primary/40 bg-primary/[0.02]" : "border-transparent hover:border-primary/20 hover:bg-slate-50"
              )}
            >
              <div className="flex flex-col pt-0.5" onClick={(e) => toggleSelect(b.id, e)}>
                <Checkbox 
                  checked={selectedIds.includes(b.id)}
                  className="rounded-sm border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              
              <div className="flex-1 min-w-0">
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
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bulk Action Bar */}
      {isAnySelected && (
        <div className="absolute bottom-6 left-4 right-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="bg-primary h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">
                {selectedIds.length}
              </div>
              <div className="text-sm font-semibold">Leads Selected</div>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-4 rounded-xl" disabled={isBulkSaving}>
                    {isBulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Save to List
                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Choose Destination</div>
                  <DropdownMenuItem onClick={() => handleBulkSave("general", "General Leads")} className="text-slate-700">
                    General Leads
                  </DropdownMenuItem>
                  {userLists && userLists.length > 0 && <Separator className="my-1" />}
                  {userLists?.map(list => (
                    <DropdownMenuItem key={list.id} onClick={() => handleBulkSave(list.id, list.name)} className="text-slate-700">
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => toast({ title: "Tip", description: "Use the sidebar to create new lists." })} className="text-slate-400 italic text-xs">
                    <PlusCircle className="h-3 w-3 mr-2" /> Create new in sidebar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedIds([])} 
                className="text-slate-400 hover:text-white hover:bg-white/10 h-9 w-9 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Business } from "@/app/page";
import { 
  Star, 
  MapPin, 
  Phone, 
  ArrowRight, 
  MousePointer2, 
  Globe, 
  Mail, 
  CheckCircle2, 
  Loader2, 
  PlusCircle, 
  ChevronDown, 
  X,
  Sparkles
} from "lucide-react";
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
        title: "Leads Saved Successfully",
        description: `Successfully added ${selectedBusinesses.length} leads to "${listName}".`,
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
      <div className="p-6 space-y-6 bg-white h-full">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-3 p-5 border rounded-2xl shadow-sm">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-6 w-12 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-12 text-center bg-slate-50/30">
        <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="h-10 w-10 text-primary/30" />
        </div>
        <h3 className="text-xl font-bold mb-2">Start Finding Leads</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Enter a business category and city above to generate high-quality B2B leads.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-white">
      <div className="p-6 border-b shrink-0 bg-slate-50/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            Market Results
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
              {results.length} Found
            </Badge>
          </h2>
        </div>
        <div className="flex items-center gap-3 py-2 px-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <Checkbox 
            id="select-all" 
            checked={allSelected} 
            onCheckedChange={toggleSelectAll}
            className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
          />
          <label 
            htmlFor="select-all" 
            className="text-xs font-bold text-slate-700 cursor-pointer select-none uppercase tracking-wider"
          >
            Select All Results
          </label>
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-4 space-y-4 pb-32">
          {results.map((b) => (
            <div 
              key={b.id} 
              onClick={() => onSelect(b)}
              className={cn(
                "group border-2 p-5 rounded-2xl cursor-pointer transition-all shadow-sm bg-white relative flex gap-4",
                selectedIds.includes(b.id) ? "border-primary/40 bg-primary/[0.03] shadow-md" : "border-slate-50 hover:border-primary/20 hover:bg-slate-50 hover:shadow-md"
              )}
            >
              <div className="flex flex-col pt-1" onClick={(e) => toggleSelect(b.id, e)}>
                <Checkbox 
                  checked={selectedIds.includes(b.id)}
                  className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5 shadow-none"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate pr-2 tracking-tight">
                    {b.name}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-[11px] font-bold text-yellow-700">{b.rating}</span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{b.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>{b.phone}</span>
                  </div>
                  {(b.email || b.website) && (
                    <div className="flex flex-col gap-1.5 mt-1 pt-1 border-t border-slate-100/50">
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
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
                  <Badge variant="outline" className="font-bold text-[10px] text-slate-500 border-slate-200 bg-slate-50 uppercase tracking-widest px-2 py-0.5">
                    {b.category}
                  </Badge>
                  <div className="text-primary text-xs font-extrabold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
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
        <div className="absolute bottom-8 left-4 right-4 animate-in slide-in-from-bottom-8 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="bg-primary h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/30">
                {selectedIds.length}
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-bold leading-tight">Leads Selected</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Ready to save</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/20 border-none transition-all active:scale-95" disabled={isBulkSaving}>
                    {isBulkSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                    Save to List
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-white border-slate-200 rounded-2xl p-2 shadow-2xl">
                  <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Destination List</div>
                  <DropdownMenuItem onClick={() => handleBulkSave("general", "General Leads")} className="rounded-xl px-3 py-2.5 text-slate-700 font-semibold focus:bg-slate-50">
                    General Leads
                  </DropdownMenuItem>
                  {userLists && userLists.length > 0 && <Separator className="my-1.5 opacity-50" />}
                  {userLists?.map(list => (
                    <DropdownMenuItem key={list.id} onClick={() => handleBulkSave(list.id, list.name)} className="rounded-xl px-3 py-2.5 text-slate-700 font-semibold focus:bg-slate-50">
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                  <Separator className="my-1.5 opacity-50" />
                  <DropdownMenuItem onClick={() => toast({ title: "Navigation Tip", description: "Use the sidebar to create new custom lists." })} className="text-slate-400 italic text-xs px-3 py-2 rounded-xl focus:bg-slate-50">
                    <PlusCircle className="h-4 w-4 mr-2" /> Create custom list in sidebar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedIds([])} 
                className="text-slate-400 hover:text-white hover:bg-white/10 h-11 w-11 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

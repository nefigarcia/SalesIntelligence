"use client";

import { useState } from "react";
import { Business } from "@/app/page";
import {
  Star,
  MapPin,
  Phone,
  Globe,
  CheckCircle2,
  Loader2,
  ChevronDown,
  X,
  Sparkles,
  ArrowRight,
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
import { cn } from "@/lib/utils";

// Deterministic avatar color from business name
const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-orange-500",
  "bg-teal-500", "bg-cyan-600", "bg-indigo-500", "bg-pink-500",
  "bg-emerald-500", "bg-amber-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
    setSelectedIds(allSelected ? [] : results.map(b => b.id));
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSave = async (listId = "general", listName = "General Leads") => {
    if (!db || !user || selectedIds.length === 0) return;
    setIsBulkSaving(true);
    const selected = results.filter(b => selectedIds.includes(b.id));
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    try {
      await runTransaction(db, async (tx) => {
        const listDoc = await tx.get(listRef);
        if (!listDoc.exists()) {
          tx.set(listRef, { id: listId, name: listName, userId: user.uid, count: selected.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } else {
          tx.update(listRef, { count: increment(selected.length), updatedAt: serverTimestamp() });
        }
        selected.forEach(b => {
          const leadRef = doc(db, "users", user.uid, "leadLists", listId, "leads", b.id);
          tx.set(leadRef, { id: b.id, name: b.name, address: b.address, phoneNumber: b.phone, category: b.category, rating: b.rating, reviews: b.reviews, website: b.website || "", email: b.email || "", status: "new", savedAt: serverTimestamp() });
        });
      });
      toast({ title: `${selected.length} leads saved to "${listName}"` });
      setSelectedIds([]);
    } catch {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: listRef.path, operation: 'write' }));
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 bg-white h-full">
        <div className="flex flex-col gap-1.5 mb-4">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-3.5 w-20 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-3 p-3.5 border border-slate-100 rounded-xl">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-10 text-center bg-white">
        <div className="h-14 w-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="h-7 w-7 text-primary/40" />
        </div>
        <h3 className="text-base font-bold mb-1.5 text-slate-800">Find your next clients</h3>
        <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
          Search for a business type and city to generate leads.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white relative">
      {/* List header */}
      <div className="px-4 py-3 border-b shrink-0 flex items-center gap-3">
        <Checkbox
          id="select-all"
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          className="rounded border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
        />
        <label htmlFor="select-all" className="text-xs font-semibold text-slate-500 cursor-pointer select-none flex-1">
          {isAnySelected ? `${selectedIds.length} selected` : `${results.length} results`}
        </label>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 pb-28">
        {results.map((b) => {
          const isSelected = selectedIds.includes(b.id);
          const initials = b.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
          const avatarColor = getAvatarColor(b.name);

          return (
            <div
              key={b.id}
              onClick={() => onSelect(b)}
              className={cn(
                "group flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border",
                isSelected
                  ? "border-primary/30 bg-primary/[0.04]"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50"
              )}
            >
              {/* Checkbox */}
              <div className="pt-0.5 shrink-0" onClick={e => toggleSelect(b.id, e)}>
                <Checkbox
                  checked={isSelected}
                  className="rounded border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                />
              </div>

              {/* Avatar */}
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor)}>
                {initials || "?"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-1">
                    {b.name}
                  </span>
                  {b.rating != null && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold text-slate-600 tabular-nums">{b.rating.toFixed(1)}</span>
                      {b.reviews != null && (
                        <span className="text-[10px] text-slate-400 ml-0.5">({b.reviews})</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{b.address}</span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {b.phone && b.phone !== "Loading phone..." && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {b.phone}
                    </span>
                  )}
                  {b.phone === "Loading phone..." && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-300 animate-pulse">
                      <Phone className="h-3 w-3" /> Loading...
                    </span>
                  )}
                  {b.website && (
                    <span className="flex items-center gap-1 text-[11px] text-primary/70 font-medium truncate max-w-[120px]">
                      <Globe className="h-3 w-3 shrink-0" />
                      {b.website.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-[9px] font-semibold text-slate-400 border-slate-200 bg-slate-50/80 px-1.5 py-0 capitalize">
                    {(b.category || "Business").replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                    View <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk save bar */}
      {isAnySelected && (
        <div className="absolute bottom-4 left-3 right-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                {selectedIds.length}
              </div>
              <span className="text-sm font-semibold">leads selected</span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 px-4 bg-primary hover:bg-primary/90 font-semibold rounded-lg text-xs" disabled={isBulkSaving}>
                    {isBulkSaving
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                    Save
                    <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => handleBulkSave("general", "General Leads")}>
                    General Leads
                  </DropdownMenuItem>
                  {userLists?.map(list => (
                    <DropdownMenuItem key={list.id} onClick={() => handleBulkSave(list.id, list.name)}>
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setSelectedIds([])}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

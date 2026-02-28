
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Phone, Globe, Trash2, ExternalLink, Search, Mail, Building2, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SavedLeadsViewProps {
  listId: string | null;
}

export function SavedLeadsView({ listId }: SavedLeadsViewProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const activeListId = listId || "general";
    const path = `users/${user.uid}/leadLists/${activeListId}/leads`;
    return query(collection(db, path), orderBy("savedAt", "desc"));
  }, [db, user, listId]);

  const { data: leads, loading } = useCollection(leadsQuery);

  const handleDeleteLead = async (leadId: string) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    const listRef = doc(db, "users", user.uid, "leadLists", activeListId);

    deleteDoc(leadRef)
      .then(() => {
        updateDoc(listRef, { 
          count: increment(-1),
          updatedAt: serverTimestamp()
        }).catch(() => {});
        toast({ title: "Lead Removed", description: "Business removed from list." });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: leadRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    
    updateDoc(leadRef, { status: newStatus }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: leadRef.path,
        operation: 'update',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  // Simulation of the "Data Engineering" Enrichment blocker #1
  const simulateEnrichment = (leadId: string) => {
    setEnrichingId(leadId);
    handleUpdateStatus(leadId, "enriching");
    
    setTimeout(() => {
      handleUpdateStatus(leadId, "ready");
      setEnrichingId(null);
      toast({
        title: "Enrichment Complete",
        description: "Found valid contact info via website scrape.",
      });
    }, 2000);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 w-full bg-white h-full">
        <Skeleton className="h-10 w-64 mb-10 rounded-xl" />
        <div className="border rounded-2xl overflow-hidden">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full opacity-50" />
          <Skeleton className="h-16 w-full opacity-30" />
          <Skeleton className="h-16 w-full opacity-10" />
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8 border border-slate-100 animate-in fade-in zoom-in duration-500">
          <Building2 className="h-12 w-12 text-slate-200" />
        </div>
        <h2 className="text-3xl font-extrabold mb-3 text-slate-900">List is Empty</h2>
        <p className="text-muted-foreground max-w-sm text-lg font-medium leading-relaxed">
          Head back to the Search tab to find local businesses and organize them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <div className="p-8 border-b shrink-0 flex items-center justify-between bg-slate-50/30">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            {listId ? "Pipeline Management" : "All Leads Archive"}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">
              Outreach & Conversion Status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm py-2 px-5 font-black border-primary/30 text-primary bg-primary/5 rounded-xl shadow-sm">
            {leads.length} LEADS IN PIPELINE
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
            <TableRow className="border-b-2">
              <TableHead className="w-[320px] font-black uppercase text-[11px] tracking-widest text-slate-400 py-6">Business Profile</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-slate-400">Pipeline Status</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-slate-400">Contact Details</TableHead>
              <TableHead className="font-black uppercase text-[11px] tracking-widest text-slate-400">Actions</TableHead>
              <TableHead className="text-right font-black uppercase text-[11px] tracking-widest text-slate-400">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow 
                key={lead.id} 
                className={cn(
                  "transition-all border-b border-slate-100",
                  lead.status === "contacted" && "bg-green-50/50",
                  lead.status === "enriching" && "bg-blue-50/30",
                  lead.status === "ready" && "bg-indigo-50/30"
                )}
              >
                <TableCell className="font-bold text-slate-900 py-6">
                  <div className="flex flex-col">
                    <span className="text-base font-black tracking-tight">{lead.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold mt-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-400" /> {lead.address}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "font-bold uppercase tracking-wider text-[10px] border-none px-2 py-0.5 w-fit",
                        lead.status === "contacted" ? "bg-green-100 text-green-700" : 
                        lead.status === "ready" ? "bg-indigo-100 text-indigo-700" :
                        "bg-slate-100 text-slate-600"
                      )}
                    >
                      {lead.status || "new"}
                    </Badge>
                    {lead.status === "new" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 p-0 flex items-center gap-1 justify-start"
                        onClick={() => simulateEnrichment(lead.id)}
                      >
                        <Sparkles className="h-3 w-3" /> Find Email
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-primary/60" /> {lead.phoneNumber || "No phone"}
                    </div>
                    {lead.email ? (
                      <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                        <Mail className="h-3.5 w-3.5" /> {lead.email}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No email found</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={lead.status === "contacted" ? "outline" : "default"}
                      className={cn(
                        "h-8 text-xs font-bold rounded-lg",
                        lead.status === "contacted" ? "border-green-200 text-green-700" : ""
                      )}
                      onClick={() => handleUpdateStatus(lead.id, lead.status === "contacted" ? "ready" : "contacted")}
                    >
                      {lead.status === "contacted" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                      {lead.status === "contacted" ? "Emailed" : "Mark Sent"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
                    onClick={() => handleDeleteLead(lead.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

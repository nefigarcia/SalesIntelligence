
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
import { MapPin, Phone, Trash2, Mail, Building2, CheckCircle2, Sparkles, Loader2, Globe, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { scrapeEmailFromWebsite } from "@/lib/lead-enrichment";

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

  const handleUpdateStatus = async (leadId: string, updates: any) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    
    updateDoc(leadRef, { ...updates, updatedAt: serverTimestamp() }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: leadRef.path,
        operation: 'update',
        requestResourceData: updates,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleEnrichLead = async (lead: any) => {
    if (!lead.website) {
      toast({ variant: "destructive", title: "Action Required", description: "This business has no website to scrape." });
      return;
    }

    setEnrichingId(lead.id);
    handleUpdateStatus(lead.id, { status: "enriching" });

    try {
      const result = await scrapeEmailFromWebsite(lead.website);
      
      if (result.found && result.email) {
        handleUpdateStatus(lead.id, { 
          status: "ready", 
          email: result.email 
        });
        toast({
          title: "Email Discovered!",
          description: `Scraped: ${result.email}`,
        });
      } else {
        // Mark as ready but without email, so we can show 'Email not found'
        handleUpdateStatus(lead.id, { status: "ready" });
        toast({
          variant: "destructive",
          title: "Scrape Incomplete",
          description: result.error || "Could not find a public email on this domain.",
        });
      }
    } catch (err: any) {
      handleUpdateStatus(lead.id, { status: "new" });
      toast({
        variant: "destructive",
        title: "Automation Error",
        description: "Network timeout or SSL error while scraping.",
      });
    } finally {
      setEnrichingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 w-full bg-white h-full">
        <Skeleton className="h-10 w-64 mb-10 rounded-xl" />
        <div className="border rounded-2xl overflow-hidden">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full mb-1" />)}
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8 border border-slate-100">
          <Building2 className="h-12 w-12 text-slate-200" />
        </div>
        <h2 className="text-3xl font-extrabold mb-3 text-slate-900">Pipeline Empty</h2>
        <p className="text-muted-foreground max-sm text-lg font-medium">
          Save leads from the Search tab to begin your outreach process.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <div className="p-8 border-b shrink-0 flex items-center justify-between bg-slate-50/30">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            {listId ? "Sales Pipeline" : "Global Prospect Archive"}
          </h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
            Automated Outreach Management
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-2 px-5 font-black border-primary/30 text-primary bg-primary/5 rounded-xl">
          {leads.length} TARGETS
        </Badge>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
            <TableRow className="border-b-2">
              <TableHead className="w-[300px] font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Company Profile</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Current Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Contact Info</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Outreach</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow 
                key={lead.id} 
                className={cn(
                  "transition-all border-b border-slate-50",
                  lead.status === "contacted" ? "bg-green-100 hover:bg-green-200" : 
                  lead.status === "enriching" ? "bg-blue-50/50" : "hover:bg-slate-50"
                )}
              >
                <TableCell className="py-6 pl-8">
                  <div className="flex flex-col">
                    <span className="text-base font-black tracking-tight text-slate-900">{lead.name}</span>
                    <span className="text-[11px] text-muted-foreground font-semibold mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {lead.address}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Badge 
                      className={cn(
                        "font-black uppercase tracking-widest text-[9px] px-2 py-0.5 w-fit border-none",
                        lead.status === "contacted" ? "bg-green-600 text-white" : 
                        lead.status === "synced" ? "bg-green-500 text-white" :
                        lead.status === "ready" ? "bg-indigo-600 text-white" :
                        "bg-slate-200 text-slate-600"
                      )}
                    >
                      {lead.status || "new"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-primary/40" /> {lead.phoneNumber || "No phone"}
                    </div>
                    {lead.website ? (
                      <a 
                        href={lead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] text-primary font-bold hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" /> 
                        <span className="truncate max-w-[150px]">
                          {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
                        <Globe className="h-3.5 w-3.5" /> No website
                      </div>
                    )}
                    
                    {/* Find Email / Email Result Logic */}
                    <div className="mt-1">
                      {lead.email ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-700 font-bold">
                          <Mail className="h-3.5 w-3.5" /> {lead.email}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {enrichingId === lead.id ? (
                            <span className="text-[10px] font-bold text-blue-600 animate-pulse flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Scraping...
                            </span>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] font-bold text-primary p-0 flex items-center gap-1 justify-start hover:bg-transparent"
                                onClick={() => handleEnrichLead(lead)}
                              >
                                <Sparkles className="h-3 w-3" /> Find Email
                              </Button>
                              {lead.status === 'ready' && !lead.email && (
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                  Email not found
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant={lead.status === "contacted" ? "secondary" : "default"}
                    className={cn(
                      "h-8 text-[11px] font-black rounded-lg uppercase tracking-wider",
                      lead.status === "contacted" ? "bg-green-700 text-white hover:bg-green-800" : ""
                    )}
                    onClick={() => handleUpdateStatus(lead.id, { status: lead.status === "contacted" ? "ready" : "contacted" })}
                  >
                    {lead.status === "contacted" ? <CheckCircle2 className="h-3 w-3 mr-2" /> : <Mail className="h-3 w-3 mr-2" />}
                    {lead.status === "contacted" ? "Contacted" : "Mark Contacted"}
                  </Button>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-slate-300 hover:text-destructive transition-colors"
                    onClick={() => handleDeleteLead(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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

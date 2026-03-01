
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
import { 
  MapPin, 
  Phone, 
  Trash2, 
  Mail, 
  Building2, 
  Sparkles, 
  Loader2, 
  Globe, 
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Target,
  Zap,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { enrichLeadAction } from "@/lib/lead-enrichment";
import { LeadsKanban } from "@/components/leads-kanban";

type StatusFilter = "all" | "new" | "enriching" | "ready" | "contacted" | "synced";
type ViewMode = "table" | "kanban";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "ready", label: "Enriched" },
  { id: "contacted", label: "Contacted" },
  { id: "synced", label: "Synced" },
];

interface SavedLeadsViewProps {
  listId: string | null;
}

export function SavedLeadsView({ listId }: SavedLeadsViewProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);

  const leadsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const activeListId = listId || "general";
    return query(
      collection(db, "users", user.uid, "leadLists", activeListId, "leads"),
      orderBy("savedAt", "desc")
    );
  }, [db, user, listId]);

  const { data: leads, isLoading } = useCollection(leadsQuery);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (statusFilter === "all") return leads;
    return leads.filter((l: any) => (l.status || "new") === statusFilter);
  }, [leads, statusFilter]);

  const handleDeleteLead = async (leadId: string) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    const listRef = doc(db, "users", user.uid, "leadLists", activeListId);

    deleteDoc(leadRef)
      .then(() => {
        updateDoc(listRef, { count: increment(-1), updatedAt: serverTimestamp() }).catch(() => {});
        toast({ title: "Lead Removed" });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: leadRef.path, operation: 'delete' }));
      });
  };

  const handleUpdateStatus = async (leadId: string, updates: any) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    updateDoc(leadRef, { ...updates, updatedAt: serverTimestamp() }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: leadRef.path, operation: 'update', requestResourceData: updates }));
    });
  };

  const handleEnrichLead = async (lead: any) => {
    if (!lead.website) {
      toast({ variant: "destructive", title: "Action Required", description: "No website available for analysis." });
      return;
    }
    setEnrichingId(lead.id);
    handleUpdateStatus(lead.id, { status: "enriching" });
    try {
      const result = await enrichLeadAction(lead.website, lead.name);
      await handleUpdateStatus(lead.id, {
        status: "ready",
        email: result.email || lead.email || "",
        techStack: result.techStack || [],
        socialLinks: result.socialLinks || {},
        score: result.score,
        intentSignals: result.intentSignals || [],
        updatedAt: serverTimestamp()
      };

      handleUpdateStatus(lead.id, updates);
    } catch (err: any) {
      handleUpdateStatus(lead.id, { status: "new" });
    } finally {
      setEnrichingId(null);
    }
  };

  const handleBulkEnrich = async () => {
    if (!leads || leads.length === 0 || isBulkEnriching) return;
    
    const targets = leads.filter(l => l.status === 'new' || l.status === 'enriching');
    if (targets.length === 0) {
      toast({ title: "Already Enriched", description: "All prospects in this list have been analyzed." });
      return;
    }

    setIsBulkEnriching(true);
    toast({ title: "Bulk Enrichment Started", description: `Processing ${targets.length} prospects...` });

    for (const lead of targets) {
      await handleEnrichLead(lead);
    }

    setIsBulkEnriching(false);
    toast({ title: "Enrichment Complete", description: "All target data has been refreshed." });
  };

  const handleWebsiteClick = (lead: any) => {
    window.open(lead.website, '_blank');
    if (lead.status !== 'synced' && lead.status !== 'contacted') {
      handleUpdateStatus(lead.id, { status: 'contacted' });
      toast({ title: "Status Updated", description: "Prospect marked as contacted." });
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
        <p className="text-muted-foreground text-lg font-medium">
          Find prospects on the map and save them to start your pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b shrink-0 bg-slate-50/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
              Pipeline Hub
            </h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-0.5">
              {leads.length} leads · {filteredLeads.length} shown
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "table" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "kanban" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Bulk Enrich */}
            <Button
              size="sm"
              onClick={handleBulkEnrich}
              disabled={isBulkEnriching || !!enrichingId}
              className="h-9 font-bold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none"
              variant="outline"
            >
              {isBulkEnriching
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              Enrich All
            </Button>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "text-xs font-black px-3 py-1.5 rounded-full border transition-all",
                statusFilter === f.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {f.label}
              {f.id !== "all" && (
                <span className={cn("ml-1.5", statusFilter === f.id ? "opacity-70" : "text-slate-400")}>
                  {(leads as any[]).filter((l: any) => (l.status || "new") === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleBulkEnrich} 
            disabled={isBulkEnriching}
            className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {isBulkEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Enrich All Targets
          </Button>
          <Badge variant="outline" className="text-sm py-2 px-5 font-black border-primary/30 text-primary bg-primary/5 rounded-xl">
            {leads.length} TARGETS
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
            <TableRow className="border-b-2">
              <TableHead className="w-[300px] font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Target Profile</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Contact Intelligence</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Tech & Growth</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Pipeline Stage</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow 
                key={lead.id} 
                className={cn(
                  "transition-all border-b border-slate-50",
                  lead.status === "contacted" ? "bg-green-50/80 hover:bg-green-100" : 
                  lead.status === "synced" ? "bg-indigo-50/40" :
                  lead.status === "enriching" ? "bg-blue-50/50" : "hover:bg-slate-50"
                )}
              >
                <TableCell className="py-6 pl-8">
                  <div className="flex flex-col">
                    <span className="text-base font-black tracking-tight text-slate-900 truncate max-w-[220px]">{lead.name}</span>
                    <span className="text-[10px] text-muted-foreground font-bold mt-1 flex items-center gap-1 uppercase tracking-tight">
                      <MapPin className="h-3 w-3" /> {lead.address.split(',')[0]}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      {lead.website && (
                        <div 
                          onClick={() => handleWebsiteClick(lead)} 
                          className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-md hover:bg-primary/10 hover:text-primary transition-all cursor-pointer group"
                        >
                          <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary" />
                          <span className="text-[10px] font-bold truncate max-w-[120px]">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border-2 shrink-0 shadow-sm",
                      (lead.score || 0) > 70 ? "border-green-200 bg-green-50 text-green-700" :
                      (lead.score || 0) > 40 ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                      "border-slate-100 bg-slate-50 text-slate-400"
                    )}>
                      <span className="text-xs font-black">{lead.score || '--'}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Contact</span>
                      {lead.email ? (
                        <span className="text-[11px] font-bold text-indigo-700 truncate">{lead.email}</span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          className="h-5 p-0 text-[10px] font-black text-primary hover:bg-transparent justify-start"
                          onClick={() => handleEnrichLead(lead)}
                          disabled={enrichingId === lead.id}
                        >
                          {enrichingId === lead.id ? "SCRAPING..." : "EMAIL NOT FOUND (FIND)"}
                        </Button>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      {lead.techStack?.slice(0, 3).map((tech: string) => (
                        <Badge key={tech} variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-500 bg-white px-1.5">
                          {tech}
                        </Badge>
                      ))}
                      {(lead.techStack?.length > 3) && <span className="text-[9px] font-bold text-slate-400">+{lead.techStack.length - 3}</span>}
                      {!lead.techStack && <span className="text-[10px] text-slate-300 italic">No signals</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {lead.socialLinks?.linkedin && <Linkedin className="h-3 w-3 text-blue-700 opacity-60" />}
                        {lead.socialLinks?.facebook && <Facebook className="h-3 w-3 text-blue-600 opacity-60" />}
                        {lead.socialLinks?.instagram && <Instagram className="h-3 w-3 text-pink-600 opacity-60" />}
                      </div>
                      {lead.intentSignals?.includes('Growth potential') && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 uppercase">
                          <TrendingUp className="h-3 w-3" /> Hiring
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge 
                    className={cn(
                      "font-black uppercase tracking-widest text-[9px] px-2.5 py-1 border-none rounded-lg",
                      lead.status === "contacted" ? "bg-green-600 text-white" : 
                      lead.status === "synced" ? "bg-indigo-600 text-white" :
                      lead.status === "ready" ? "bg-primary text-white" :
                      "bg-slate-200 text-slate-600"
                    )}
                  >
                    {lead.status === "synced" ? "POSTED TO SHEETS" : (lead.status || "new")}
                  </Badge>
                </TableCell>

                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary transition-colors"
                            onClick={() => handleEnrichLead(lead)}
                            disabled={enrichingId === lead.id || isBulkEnriching}
                            title="Enrich lead"
                          >
                            <Zap className={cn("h-4 w-4", enrichingId === lead.id && "animate-spin")} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-destructive"
                            onClick={() => handleDeleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLeads.length === 0 && (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  No leads match the selected filter.
                </div>
              )}
            </div>

            {/* MOBILE Cards */}
            <div className="block md:hidden p-4 space-y-4 pb-20">
              {filteredLeads.map((lead: any) => (
                <div key={lead.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-2">
                      <h3 className="font-black text-lg text-slate-900 leading-tight mb-1">{lead.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <MapPin className="h-3 w-3 shrink-0" /> {lead.address?.split(',')[0]}
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-[10px] uppercase font-black tracking-widest shrink-0",
                      lead.status === "contacted" ? "bg-green-600 text-white" :
                      lead.status === "ready" ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {lead.status || "new"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Score</span>
                      <span className={cn("text-xl font-black", (lead.score || 0) >= 70 ? "text-green-600" : "text-slate-700")}>
                        {lead.score || '--'}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center gap-2 overflow-hidden">
                      {lead.phoneNumber && (
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 text-primary/60 shrink-0" /> {lead.phoneNumber}
                        </span>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3 shrink-0" /> Visit Site
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    {lead.email ? (
                      <span className="text-xs font-bold text-indigo-700 flex items-center gap-1 truncate pr-2">
                        <Mail className="h-3 w-3 shrink-0" /> {lead.email}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-bold"
                        onClick={() => handleEnrichLead(lead)}
                        disabled={enrichingId === lead.id || isBulkEnriching}
                      >
                        <Zap className={cn("h-3 w-3 mr-1", enrichingId === lead.id && "animate-spin")} />
                        {enrichingId === lead.id ? "Analyzing..." : "Find Email"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive shrink-0 bg-slate-50"
                      onClick={() => handleDeleteLead(lead.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredLeads.length === 0 && (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No leads match the selected filter.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

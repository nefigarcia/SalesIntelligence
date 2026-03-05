
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
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Globe, 
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { enrichLeadAction } from "@/lib/lead-enrichment";

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

  const { data: leads, isLoading } = useCollection(leadsQuery);

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
      toast({ variant: "destructive", title: "Action Required", description: "This business has no website to analyze." });
      return;
    }

    setEnrichingId(lead.id);
    handleUpdateStatus(lead.id, { status: "enriching" });

    try {
      const result = await enrichLeadAction(lead.website, lead.name);
      
      const updates = {
        status: "ready",
        email: result.email || lead.email || "",
        techStack: result.techStack || [],
        socialLinks: result.socialLinks || {},
        score: result.score,
        intentSignals: result.intentSignals || [],
        updatedAt: serverTimestamp()
      };

      handleUpdateStatus(lead.id, updates);
      
      toast({
        title: "Intelligence Gathered",
        description: `Score: ${result.score}/100. Tech Stack & Socials detected.`,
      });
    } catch (err: any) {
      handleUpdateStatus(lead.id, { status: "new" });
      toast({
        variant: "destructive",
        title: "Enrichment Failed",
        description: "Could not reach the business website.",
      });
    } finally {
      setEnrichingId(null);
    }
  };

  if (isLoading) {
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
        <h2 className="text-3xl font-extrabold mb-3 text-slate-900">Intelligence Pipeline Empty</h2>
        <p className="text-muted-foreground max-sm text-lg font-medium">
          Find prospects on the map to start gathering sales intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <div className="p-8 border-b shrink-0 flex items-center justify-between bg-slate-50/30">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            {listId ? "Sales Intelligence" : "Prospect Archive"}
          </h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
            Data-Driven Outreach Engine
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-2 px-5 font-black border-primary/30 text-primary bg-primary/5 rounded-xl">
          {leads.length} TARGETS
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
        
        {/* --- DESKTOP VIEW: Table (Hidden on Mobile) --- */}
        <div className="hidden md:block min-w-[800px]">
          <Table>
            <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
              <TableRow className="border-b-2">
                <TableHead className="w-[280px] font-black uppercase text-[10px] tracking-widest text-slate-400 py-6">Target Profile</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Lead Intelligence</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Tech & Socials</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
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
                    lead.status === "enriching" ? "bg-blue-50/50" : "hover:bg-slate-50"
                  )}
                >
                  <TableCell className="py-6 pl-8">
                    <div className="flex flex-col">
                      <span className="text-base font-black tracking-tight text-slate-900 truncate max-w-[200px]">{lead.name}</span>
                      <span className="text-[10px] text-muted-foreground font-bold mt-1 flex items-center gap-1 uppercase tracking-tight">
                        <MapPin className="h-3 w-3" /> {lead.address.split(',')[0]}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded-md hover:bg-primary/10 hover:text-primary transition-colors">
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {lead.phoneNumber && (
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-primary/40" /> {lead.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center border-2",
                          (lead.score || 0) > 70 ? "border-green-200 bg-green-50 text-green-700" :
                          (lead.score || 0) > 40 ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                          "border-slate-100 bg-slate-50 text-slate-400"
                        )}>
                          <span className="text-sm font-black">{lead.score || '--'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Buy Score</span>
                          <div className="flex items-center gap-1">
                            {lead.email ? (
                              <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {lead.email}
                              </span>
                            ) : (
                              <Button 
                                variant="ghost" 
                                className="h-5 p-0 text-[10px] font-black text-primary hover:bg-transparent"
                                onClick={() => handleEnrichLead(lead)}
                                disabled={enrichingId === lead.id}
                              >
                                {enrichingId === lead.id ? "Analyzing..." : "Find Email"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1">
                        {lead.techStack?.map((tech: string) => (
                          <Badge key={tech} variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-500 bg-white">
                            {tech}
                          </Badge>
                        )) || <span className="text-[10px] text-slate-300 italic">No tech detected</span>}
                      </div>
                      <div className="flex gap-2">
                        {lead.socialLinks?.linkedin && <Linkedin className="h-3.5 w-3.5 text-blue-700 opacity-60" />}
                        {lead.socialLinks?.facebook && <Facebook className="h-3.5 w-3.5 text-blue-600 opacity-60" />}
                        {lead.socialLinks?.instagram && <Instagram className="h-3.5 w-3.5 text-pink-600 opacity-60" />}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge 
                      className={cn(
                        "font-black uppercase tracking-widest text-[9px] px-2 py-0.5 border-none",
                        lead.status === "contacted" ? "bg-green-600 text-white" : 
                        lead.status === "synced" ? "bg-indigo-500 text-white" :
                        lead.status === "ready" ? "bg-primary text-white" :
                        "bg-slate-200 text-slate-600"
                      )}
                    >
                      {lead.status || "new"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary transition-colors"
                        onClick={() => handleEnrichLead(lead)}
                        disabled={enrichingId === lead.id}
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
        </div>

        {/* --- MOBILE VIEW: Stacked Cards (Hidden on Desktop) --- */}
        <div className="block md:hidden p-4 space-y-4 pb-20">
          {leads.map((lead: any) => (
            <div key={lead.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative">
              
              <div className="flex justify-between items-start mb-3">
                <div className="pr-2">
                  <h3 className="font-black text-lg text-slate-900 leading-tight mb-1">{lead.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <MapPin className="h-3 w-3 shrink-0" /> {lead.address.split(',')[0]}
                  </div>
                </div>
                <Badge className={cn("text-[10px] uppercase font-black tracking-widest shrink-0", 
                  lead.status === "contacted" ? "bg-green-600 text-white" : 
                  lead.status === "ready" ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {lead.status || "new"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Buy Score</span>
                  <span className={cn("text-xl font-black", (lead.score || 0) > 70 ? "text-green-600" : "text-slate-700")}>
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
                       <Globe className="h-3 w-3 shrink-0" /> Visit Website
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
                    disabled={enrichingId === lead.id}
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
        </div>

      </div>
    </div>
    
  );
}

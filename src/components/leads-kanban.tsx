
"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, ChevronRight, Zap, Loader2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { id: "new", label: "New", color: "bg-slate-100 text-slate-600", barColor: "bg-slate-300" },
  { id: "ready", label: "Enriched", color: "bg-indigo-100 text-indigo-700", barColor: "bg-indigo-400" },
  { id: "contacted", label: "Contacted", color: "bg-green-100 text-green-700", barColor: "bg-green-400" },
  { id: "synced", label: "Synced", color: "bg-purple-100 text-purple-700", barColor: "bg-purple-400" },
];

interface LeadsKanbanProps {
  leads: any[];
  listId: string | null;
  onEnrich: (lead: any) => void;
  enrichingId: string | null;
}

export function LeadsKanban({ leads, listId, onEnrich, enrichingId }: LeadsKanbanProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleMoveStage = async (leadId: string, newStatus: string) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "leadLists", activeListId, "leads", leadId);
    await updateDoc(leadRef, { status: newStatus, updatedAt: serverTimestamp() });
    const stageName = STAGES.find(s => s.id === newStatus)?.label || newStatus;
    toast({ title: "Stage Updated", description: `Lead moved to ${stageName}.` });
  };

  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter(l => (l.status || "new") === stage.id);
        const nextStageIndex = STAGES.findIndex(s => s.id === stage.id) + 1;
        const nextStage = nextStageIndex < STAGES.length ? STAGES[nextStageIndex] : null;

        return (
          <div
            key={stage.id}
            className="flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", stage.barColor)} />
                <span className="font-black text-sm uppercase tracking-widest text-slate-600">{stage.label}</span>
              </div>
              <Badge className={cn("text-xs font-black border-none", stage.color)}>{stageLeads.length}</Badge>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {stageLeads.map(lead => (
                <div
                  key={lead.id}
                  className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Score badge */}
                  {lead.score && (
                    <div className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1 mb-2",
                      lead.score >= 70 ? "bg-green-50 text-green-700" :
                      lead.score >= 40 ? "bg-yellow-50 text-yellow-700" :
                      "bg-slate-50 text-slate-400"
                    )}>
                      Score: {lead.score}/100
                    </div>
                  )}

                  <h4 className="font-black text-sm text-slate-900 leading-tight mb-0.5 truncate">{lead.name}</h4>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-3 capitalize truncate">
                    {(lead.category || "Business").replace(/_/g, " ")}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {lead.email}
                      </div>
                    )}
                    {lead.phoneNumber && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phoneNumber}
                      </div>
                    )}
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary/70 font-semibold hover:text-primary truncate"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 28)}
                      </a>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
                    {!lead.email && lead.website && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] font-black text-primary hover:bg-primary/5"
                        onClick={() => onEnrich(lead)}
                        disabled={enrichingId === lead.id}
                      >
                        {enrichingId === lead.id
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <Zap className="h-3 w-3 mr-1" />}
                        Enrich
                      </Button>
                    )}
                    {nextStage && (
                      <button
                        className="ml-auto text-[10px] font-black text-slate-400 hover:text-primary flex items-center gap-0.5 transition-colors"
                        onClick={() => handleMoveStage(lead.id, nextStage.id)}
                      >
                        → {nextStage.label}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {stageLeads.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-xl">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

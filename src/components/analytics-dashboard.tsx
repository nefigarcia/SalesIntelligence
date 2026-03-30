
"use client";

import { useUser, useFirestore } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Building2, Mail, Target, Zap, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  new: "#94a3b8",
  enriching: "#60a5fa",
  ready: "#6366f1",
  contacted: "#22c55e",
  synced: "#a78bfa",
};

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface AnalyticsDashboardProps {
  listId: string | null;
}

export function AnalyticsDashboard({ listId }: AnalyticsDashboardProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;

    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const allLeads: any[] = [];

        if (listId) {
          const snap = await getDocs(
            collection(db, "users", user.uid, "leadLists", listId, "leads")
          );
          snap.docs.forEach(d => allLeads.push(d.data()));
        } else {
          const listsSnap = await getDocs(
            collection(db, "users", user.uid, "leadLists")
          );
          for (const listDoc of listsSnap.docs) {
            const leadsSnap = await getDocs(
              collection(db, "users", user.uid, "leadLists", listDoc.id, "leads")
            );
            leadsSnap.docs.forEach(d => allLeads.push(d.data()));
          }
        }

        setLeads(allLeads);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [db, user, listId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 w-full bg-slate-50/50 flex-1">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const total = leads.length;
  const withEmail = leads.filter(l => l.email).length;
  const withWebsite = leads.filter(l => l.website).length;
  const avgScore = total > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / total)
    : 0;
  const highScoreLeads = leads.filter(l => (l.score || 0) >= 70).length;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  leads.forEach(l => {
    const s = l.status || "new";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Score histogram
  const scoreBuckets = [
    { name: "0–25", count: 0 },
    { name: "26–50", count: 0 },
    { name: "51–75", count: 0 },
    { name: "76–100", count: 0 },
  ];
  leads.forEach(l => {
    const s = l.score || 0;
    if (s <= 25) scoreBuckets[0].count++;
    else if (s <= 50) scoreBuckets[1].count++;
    else if (s <= 75) scoreBuckets[2].count++;
    else scoreBuckets[3].count++;
  });

  // Tech stack frequency
  const techCounts: Record<string, number> = {};
  leads.forEach(l => {
    (l.techStack || []).forEach((t: string) => {
      if (t !== "Generic HTML") techCounts[t] = (techCounts[t] || 0) + 1;
    });
  });
  const techData = Object.entries(techCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Top categories
  const categoryCounts: Record<string, number> = {};
  leads.forEach(l => {
    const cat = (l.category || "Unknown").replace(/_/g, " ");
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Analytics</h2>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          {listId ? "Current List" : "All Lists"} · {total} Total Leads
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-slate-100">
            <TrendingUp className="h-10 w-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">No Data Yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Find and save leads from the Lead Finder, then enrich them to see analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Leads", value: total, icon: Building2, color: "text-primary", bg: "bg-primary/5" },
              { label: "Avg Lead Score", value: avgScore, suffix: "/100", icon: Target, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Emails Found", value: withEmail, icon: Mail, color: "text-green-600", bg: "bg-green-50" },
              { label: "Hot Leads (70+)", value: highScoreLeads, icon: Zap, color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map(({ label, value, suffix, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3", bg)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {value}<span className="text-base text-slate-400">{suffix}</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline Status Donut */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Pipeline Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend formatter={(value) => (
                    <span className="text-xs font-bold capitalize">{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreBuckets} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tech Stack */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Tech Stack Detected</h3>
              {techData.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-muted-foreground text-sm text-center px-4">
                  Run enrichment on leads to detect their tech stack.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={techData} layout="vertical" barCategoryGap="30%">
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Leads" fill="#22c55e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Business Categories</h3>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm font-bold text-slate-700 capitalize flex-1 truncate">{cat.name}</span>
                      <Badge variant="outline" className="text-xs font-black shrink-0">{cat.value}</Badge>
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 shrink-0">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.round((cat.value / total) * 100)}%`,
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Coverage */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Contact Coverage</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Has Email", value: withEmail, total, color: "bg-green-500" },
                { label: "Has Website", value: withWebsite, total, color: "bg-indigo-500" },
                { label: "Enriched", value: leads.filter(l => l.status === "ready" || l.status === "contacted").length, total, color: "bg-primary" },
              ].map(({ label, value, total: t, color }) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">{label}</span>
                    <span className="text-xs font-black text-slate-900">{t > 0 ? Math.round((value / t) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div
                      className={cn("h-2 rounded-full transition-all", color)}
                      style={{ width: t > 0 ? `${Math.round((value / t) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{value} of {t} leads</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

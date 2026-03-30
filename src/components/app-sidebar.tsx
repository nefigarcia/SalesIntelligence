"use client";

import { useState } from "react";
import {
  Search,
  ListOrdered,
  Download,
  PlusCircle,
  FolderOpen,
  LogOut,
  MoreVertical,
  Trash2,
  Loader2,
  Table as TableIcon,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, getDocs, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { ViewState } from "@/app/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  activeView: ViewState;
  selectedListId: string | null;
  onViewChange: (view: ViewState, listId?: string | null) => void;
}

const NAV_ITEMS = [
  { id: "search" as ViewState, label: "Lead Finder", icon: Search },
  { id: "lists" as ViewState, label: "Pipeline", icon: ListOrdered },
  { id: "analytics" as ViewState, label: "Analytics", icon: BarChart2 },
];

export function AppSidebar({ activeView, selectedListId, onViewChange }: AppSidebarProps) {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "leadLists"), orderBy("createdAt", "desc"));
  }, [db, user]);

  const { data: savedLists } = useCollection(listsQuery);

  const handleSignOut = () => {
    if (auth) signOut(auth);
  };

  const handleCreateList = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!db || !user || !newListName.trim() || isCreating) return;
    setIsCreating(true);
    const listId = `list-${Date.now()}`;
    setDoc(doc(db, "users", user.uid, "leadLists", listId), {
      id: listId,
      name: newListName.trim(),
      userId: user.uid,
      count: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
      .then(() => {
        toast({ title: `"${newListName}" created` });
        setNewListName("");
        setIsCreateDialogOpen(false);
      })
      .finally(() => setIsCreating(false));
  };

  const handleDeleteList = (listId: string) => {
    if (!db || !user) return;
    deleteDoc(doc(db, "users", user.uid, "leadLists", listId));
  };

  const handleSyncToSheets = async () => {
    const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    if (!db || !user || isSyncing) return;
    if (!appsScriptUrl) {
      toast({ variant: "destructive", title: "NEXT_PUBLIC_APPS_SCRIPT_URL not configured" });
      return;
    }
    setIsSyncing(true);
    try {
      const activeListId = selectedListId || "general";
      const snapshot = await getDocs(collection(db, "users", user.uid, "leadLists", activeListId, "leads"));
      const unsyncedDocs = snapshot.docs.filter(d => d.data().status !== 'synced');
      if (unsyncedDocs.length === 0) {
        toast({ title: "All leads already synced" });
        return;
      }
      const payload = unsyncedDocs.map(d => {
        const data = d.data();
        return {
          "Company Name": data.name, "Industry": data.category,
          "Estimated Size": "Small", "Potential AI Need": data.intentSignals?.join(", ") || "N/A",
          "Email/Contact Info": data.email || data.phoneNumber || "No contact info",
          "Website": data.website || "N/A", "Location": data.address,
          "Status": data.status || "new", "Tech Stack": data.techStack?.join(", ") || "Generic HTML",
          "Lead Score": data.score || 0,
          "Social Links": Object.values(data.socialLinks || {}).filter(Boolean).join(", ") || "None",
        };
      });
      await fetch(appsScriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const batch = writeBatch(db);
      unsyncedDocs.forEach(d => batch.update(d.ref, { status: 'synced', updatedAt: serverTimestamp() }));
      await batch.commit();
      toast({ title: `${payload.length} leads synced to Sheets` });
    } catch {
      toast({ variant: "destructive", title: "Sync failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!db || !user || isExporting) return;
    setIsExporting(true);
    try {
      const activeListId = selectedListId || "general";
      const snapshot = await getDocs(collection(db, "users", user.uid, "leadLists", activeListId, "leads"));
      const headers = ["Company Name", "Industry", "Email", "Phone", "Website", "Location", "Status", "Score", "Tech"];
      const rows = snapshot.docs.map(d => {
        const data = d.data();
        return [`"${data.name}"`, `"${data.category}"`, `"${data.email}"`, `"${data.phoneNumber}"`, `"${data.website}"`, `"${data.address}"`, `"${data.status}"`, `"${data.score}"`, `"${data.techStack?.join('|')}"`].join(",");
      });
      const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${activeListId}.csv`;
      a.click();
      toast({ title: "CSV downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Export failed" });
    } finally {
      setIsExporting(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo */}
      <SidebarHeader className="h-14 flex items-center border-b border-sidebar-border/40 bg-sidebar-background">
        <div className="flex items-center gap-2.5 px-3 w-full">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-md shrink-0">
            <Search className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white group-data-[collapsible=icon]:hidden tracking-tight">
            ClientsFinding
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar-background py-3">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  isActive={activeView === id && (id !== "lists" || selectedListId === null)}
                  className={cn(
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors",
                    activeView === id && (id !== "lists" || selectedListId === null) &&
                      "text-white bg-sidebar-accent/60 hover:bg-sidebar-accent/60"
                  )}
                  onClick={() => onViewChange(id, id === "lists" ? null : undefined)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-1 opacity-10" />

        {/* Lists */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold text-sidebar-foreground/30 tracking-widest uppercase">
            Lists
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {savedLists?.map((list) => {
                const isActive = activeView === "lists" && selectedListId === list.id;
                return (
                  <SidebarMenuItem key={list.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={cn(
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                        isActive && "text-white bg-sidebar-accent/60 hover:bg-sidebar-accent/60"
                      )}
                      onClick={() => onViewChange("lists", list.id)}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{list.name}</span>
                      <SidebarMenuBadge className="bg-white/10 text-sidebar-foreground/60 text-[10px]">
                        {list.count || 0}
                      </SidebarMenuBadge>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreVertical className="h-3.5 w-3.5 opacity-40" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem className="text-destructive text-sm" onClick={() => handleDeleteList(list.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete list
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/20">
                      <PlusCircle className="h-4 w-4" />
                      <span>New list</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Lead List</DialogTitle>
                      <DialogDescription>Group leads by city, industry, or campaign.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateList}>
                      <div className="py-4">
                        <Input
                          placeholder="e.g. NYC Dentists Q1"
                          value={newListName}
                          onChange={e => setNewListName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isCreating || !newListName.trim()}>
                          {isCreating ? "Creating..." : "Create List"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/20 bg-sidebar-background p-3">
        {/* Export / Sync as a compact row */}
        <div className="flex gap-1.5 mb-3 group-data-[collapsible=icon]:flex-col">
          <Button
            onClick={handleSyncToSheets}
            disabled={isSyncing}
            size="sm"
            className="flex-1 h-8 bg-green-600/90 hover:bg-green-600 text-white text-xs font-semibold rounded-lg group-data-[collapsible=icon]:hidden"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TableIcon className="h-3.5 w-3.5 mr-1.5" />}
            Sync Sheets
          </Button>
          <Button
            variant="ghost"
            onClick={handleExportCSV}
            disabled={isExporting}
            size="sm"
            className="flex-1 h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 text-xs rounded-lg group-data-[collapsible=icon]:hidden"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export CSV
          </Button>
          {/* Collapsed state: icon-only dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden group-data-[collapsible=icon]:flex text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-lg">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right">
              <DropdownMenuItem onClick={handleSyncToSheets} disabled={isSyncing}>
                <TableIcon className="h-4 w-4 mr-2" /> Sync to Sheets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SidebarSeparator className="mb-3 opacity-10" />

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full px-1 py-1.5 rounded-lg hover:bg-sidebar-accent/30 transition-colors group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback className="bg-primary text-[10px] text-white font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden text-left flex-1 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-semibold text-white truncate leading-tight">{displayName}</span>
                <span className="text-[10px] text-sidebar-foreground/40 truncate leading-tight">{userEmail}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/30 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <div className="px-2 py-1.5 border-b mb-1">
              <p className="text-xs font-semibold truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="hidden" />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive text-sm">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

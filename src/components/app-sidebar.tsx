
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
  FolderPlus,
  Loader2,
  Table as TableIcon
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
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { ViewState } from "@/app/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

interface AppSidebarProps {
  activeView: ViewState;
  selectedListId: string | null;
  onViewChange: (view: ViewState, listId?: string | null) => void;
}

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
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    
    setDoc(listRef, {
      id: listId,
      name: newListName.trim(),
      userId: user.uid,
      count: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
      .then(() => {
        toast({ title: "Success", description: `"${newListName}" created.` });
        setNewListName("");
        setIsCreateDialogOpen(false);
      })
      .finally(() => setIsCreating(false));
  };

  const handleDeleteList = (listId: string) => {
    if (!db || !user) return;
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    deleteDoc(listRef);
  };

  /**
   * SOFTWARE ENGINEERING: REST API Bridge
   * Maps Firestore lead entities to Google Sheets headers and pushes via POST.
   */
  const handleSyncToSheets = async () => {
    const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

    if (!db || !user || isSyncing) return;
    
    if (!appsScriptUrl) {
      toast({ 
        variant: "destructive",
        title: "Configuration Missing", 
        description: "Please add NEXT_PUBLIC_APPS_SCRIPT_URL to your .env file to enable syncing.",
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      const activeListId = selectedListId || "general";
      const leadsRef = collection(db, "users", user.uid, "leadLists", activeListId, "leads");
      const snapshot = await getDocs(leadsRef);
      
      if (snapshot.empty) {
        toast({ variant: "destructive", title: "Empty List", description: "No leads found in this list to sync." });
        setIsSyncing(false);
        return;
      }

      // DATA TRANSFORMATION: Map Firestore schema to Google Sheet headers
      const payload = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          "Company Name": d.name,
          "Industry": d.category,
          "Estimated Size": "Small", // Default for your sheet structure
          "Potential AI Need": "N/A",  // Default for your sheet structure
          "Email/Contact Info": d.email || d.phoneNumber || "No contact info",
          "Website": d.website || "N/A",
          "Location": d.address,
          "Status": d.status || "new"
        };
      });

      // REST API CALL: Sending JSON to the Apps Script Web App
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors or specialized redirect handling
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Since mode is 'no-cors', we can't read the response body, but we know it sent
      toast({
        title: "Sync Initiated",
        description: `Successfully pushed ${payload.length} leads to your Google Sheet.`,
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Network error or invalid Apps Script URL." });
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
      
      const headers = ["Company Name", "Industry", "Email", "Phone", "Website", "Location", "Status"];
      const rows = snapshot.docs.map(doc => {
        const d = doc.data();
        return [`"${d.name}"`, `"${d.category}"`, `"${d.email}"`, `"${d.phoneNumber}"`, `"${d.website}"`, `"${d.address}"`, `"${d.status}"`].join(",");
      });

      const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${activeListId}.csv`;
      a.click();
      toast({ title: "Export Complete", description: "CSV file downloaded." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border bg-sidebar-background">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <Search className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden">
            ClientsFinding
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar-background py-4">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === "search"} 
                className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => onViewChange("search")}
              >
                <Search className="h-5 w-5" />
                <span>Lead Finder</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeView === "lists"} 
                className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => onViewChange("lists", null)}
              >
                <ListOrdered className="h-5 w-5" />
                <span>Pipeline Hub</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-4 opacity-10" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase text-sidebar-foreground/40 tracking-widest">
            Custom Lists
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {savedLists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton 
                    isActive={activeView === "lists" && selectedListId === list.id}
                    className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={() => onViewChange("lists", list.id)}
                  >
                    <FolderOpen className="h-4 w-4 text-secondary/70" />
                    <span>{list.name}</span>
                    <SidebarMenuBadge className="bg-sidebar-accent/50 text-sidebar-foreground/70">
                      {list.count || 0}
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreVertical className="h-4 w-4 opacity-50" />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteList(list.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton className="text-secondary hover:text-white">
                      <PlusCircle className="h-4 w-4" />
                      <span>New List</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Lead List</DialogTitle>
                      <DialogDescription>Group leads by city or industry.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateList}>
                      <div className="grid gap-4 py-4">
                        <Input
                          placeholder="e.g. Utah Dentists"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isCreating}>{isCreating ? "Saving..." : "Create List"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/30 bg-sidebar-background p-4">
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSyncToSheets} 
            disabled={isSyncing}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-lg"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TableIcon className="h-4 w-4 mr-2" />}
            <span className="group-data-[collapsible=icon]:hidden">Sync to Sheets</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleExportCSV} 
            disabled={isExporting}
            className="w-full bg-sidebar-accent/30 border-sidebar-border/30 text-sidebar-foreground hover:bg-sidebar-accent/60 h-10"
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            <span className="group-data-[collapsible=icon]:hidden">Export CSV</span>
          </Button>

          <SidebarSeparator className="my-2 opacity-10" />

          <div className="flex items-center gap-3 px-1">
            <Avatar className="h-8 w-8 border border-primary/40">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-primary text-[10px] text-white font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden flex-1">
              <span className="text-xs font-bold truncate text-white">{user?.displayName || user?.email?.split('@')[0]}</span>
            </div>
            <button onClick={handleSignOut} className="text-sidebar-foreground/30 hover:text-destructive group-data-[collapsible=icon]:hidden">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

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
  Loader2
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
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
import { Label } from "@/components/ui/label";

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

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "leadLists"), orderBy("createdAt", "desc"));
  }, [db, user]);

  const { data: savedLists, loading } = useCollection(listsQuery);

  const handleSignOut = () => {
    if (auth) signOut(auth);
  };

  const handleCreateList = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!db || !user || !newListName.trim() || isCreating) return;

    setIsCreating(true);
    const listId = `list-${Date.now()}`;
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    const listData = {
      id: listId,
      name: newListName.trim(),
      userId: user.uid,
      count: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    setDoc(listRef, listData)
      .then(() => {
        toast({ title: "List Created", description: `"${newListName}" is ready for leads.` });
        setNewListName("");
        setIsCreateDialogOpen(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: listRef.path,
          operation: 'create',
          requestResourceData: listData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  const handleDeleteList = (listId: string) => {
    if (!db || !user) return;
    
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    deleteDoc(listRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: listRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleExport = async () => {
    if (!db || !user || isExporting) return;
    
    setIsExporting(true);
    toast({ title: "Export Started", description: "Fetching leads for CSV generation..." });

    try {
      const activeListId = selectedListId || "general";
      const leadsRef = collection(db, "users", user.uid, "leadLists", activeListId, "leads");
      const snapshot = await getDocs(leadsRef);
      
      if (snapshot.empty) {
        toast({ variant: "destructive", title: "Export Failed", description: "This list has no leads to export." });
        setIsExporting(false);
        return;
      }

      const headers = ["Name", "Category", "Address", "Phone", "Email", "Website", "Rating", "Reviews", "Saved At"];
      const rows = snapshot.docs.map(doc => {
        const data = doc.data();
        return [
          `"${data.name || ''}"`,
          `"${data.category || ''}"`,
          `"${data.address || ''}"`,
          `"${data.phoneNumber || ''}"`,
          `"${data.email || ''}"`,
          `"${data.website || ''}"`,
          data.rating || 0,
          data.reviews || 0,
          data.savedAt ? new Date(data.savedAt.seconds * 1000).toLocaleString() : ''
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `clientsfinding-leads-${activeListId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Export Complete", description: "Your CSV file is ready." });
    } catch (err) {
      console.error("Export Error:", err);
      toast({ variant: "destructive", title: "Export Failed", description: "An error occurred while generating the CSV." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border bg-sidebar-background">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
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
                tooltip="Search Leads" 
                isActive={activeView === "search"} 
                className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => onViewChange("search")}
              >
                <Search className="h-5 w-5" />
                <span>Search Leads</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="All Saved Leads" 
                isActive={activeView === "lists" && !savedLists?.find(l => l.id === activeView)} 
                className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => onViewChange("lists", null)}
              >
                <ListOrdered className="h-5 w-5" />
                <span>All Saved Leads</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-4 opacity-10" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase text-sidebar-foreground/40 tracking-widest">
            Your Custom Lists
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-4 py-2 text-xs text-sidebar-foreground/30 animate-pulse">Loading lists...</div>
              ) : savedLists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton 
                    tooltip={list.name} 
                    isActive={activeView === "lists" && activeView === list.id}
                    className="text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={() => onViewChange("lists", list.id)}
                  >
                    <FolderOpen className="h-4 w-4 text-secondary/70" />
                    <span>{list.name}</span>
                    <SidebarMenuBadge className="bg-sidebar-accent/50 text-sidebar-foreground/70 border border-sidebar-border/50">
                      {list.count || 0}
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreVertical className="h-4 w-4 opacity-50" />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteList(list.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete List
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton 
                      tooltip="New List" 
                      className="text-secondary hover:text-white transition-colors"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Create New List</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-primary" />
                        Create New Lead List
                      </DialogTitle>
                      <DialogDescription>
                        Give your list a name to organize your gathered leads.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateList}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">List Name</Label>
                          <Input
                            id="name"
                            placeholder="e.g. New York Plumbers"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="col-span-3"
                            autoFocus
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={isCreating || !newListName.trim()}
                          className="w-full sm:w-auto"
                        >
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

      <SidebarFooter className="border-t border-sidebar-border/30 bg-sidebar-background p-4">
        <div className="flex flex-col gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full bg-sidebar-accent/30 border-sidebar-border/30 text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white transition-all"
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            <span className="group-data-[collapsible=icon]:hidden">Export Leads</span>
          </Button>
          <div className="flex items-center gap-3 px-1 py-1">
            <Avatar className="h-9 w-9 border-2 border-primary/40">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden flex-1">
              <span className="text-xs font-bold truncate text-white">{user?.displayName || user?.email?.split('@')[0]}</span>
              <span className="text-[10px] text-sidebar-foreground/40 truncate leading-none mt-0.5">{user?.email}</span>
            </div>
            <button 
              onClick={handleSignOut} 
              className="p-1.5 rounded-md hover:bg-destructive/10 text-sidebar-foreground/30 hover:text-destructive transition-colors group-data-[collapsible=icon]:hidden"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

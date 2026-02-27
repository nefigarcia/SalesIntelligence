
"use client";

import { 
  Search, 
  ListOrdered, 
  Users, 
  Settings, 
  PieChart, 
  Download,
  PlusCircle,
  FolderOpen,
  LogOut
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, useFirestore, useCollection } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-collection";
import { signOut } from "firebase/auth";

const navMain = [
  { title: "Search Leads", icon: Search, isActive: true },
  { title: "My Lists", icon: ListOrdered },
  { title: "Clients", icon: Users },
  { title: "Analytics", icon: PieChart },
];

export function AppSidebar() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "lists");
  }, [db, user]);

  const { data: savedLists, loading } = useCollection(listsQuery);

  const handleSignOut = () => {
    if (auth) signOut(auth);
  };

  const handleCreateList = async () => {
    if (!db || !user) return;
    const listId = `list-${Date.now()}`;
    const listRef = doc(db, "users", user.uid, "lists", listId);
    
    setDoc(listRef, {
      name: "New Lead List",
      count: 0,
      createdAt: serverTimestamp()
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border bg-sidebar-background">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
            {navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={item.isActive} className="text-sidebar-foreground">
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-4 opacity-20" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase text-sidebar-foreground/50 tracking-wider">
            Lead Lists
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-4 py-2 text-xs text-sidebar-foreground/50">Loading lists...</div>
              ) : savedLists?.map((list) => (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton tooltip={list.name} className="text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                    <FolderOpen className="h-4 w-4" />
                    <span>{list.name}</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                      {list.count || 0}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="New List" 
                  className="text-accent hover:text-accent-foreground"
                  onClick={handleCreateList}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create New List</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar-background p-4">
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-white group-data-[collapsible=icon]:p-0">
            <Download className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
            <span className="group-data-[collapsible=icon]:hidden">Export All Leads</span>
          </Button>
          <div className="flex items-center gap-4 px-2 py-2">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/user/100/100"} />
              <AvatarFallback>{user?.displayName?.charAt(0) || "CF"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold truncate text-white">{user?.displayName || "User"}</span>
              <span className="text-xs text-sidebar-foreground/70 truncate leading-none">{user?.email}</span>
            </div>
            <button onClick={handleSignOut} className="ml-auto group-data-[collapsible=icon]:hidden">
              <LogOut className="h-4 w-4 text-sidebar-foreground/50 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

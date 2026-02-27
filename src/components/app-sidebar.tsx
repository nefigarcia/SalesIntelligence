
"use client";

import { 
  Search, 
  ListOrdered, 
  Users, 
  Settings, 
  PieChart, 
  Download,
  PlusCircle,
  FolderOpen
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

const navMain = [
  { title: "Search Leads", icon: Search, isActive: true },
  { title: "My Lists", icon: ListOrdered },
  { title: "Clients", icon: Users },
  { title: "Analytics", icon: PieChart },
];

const savedLists = [
  { name: "Plumbers - NY", count: 12 },
  { name: "Dentists - Brooklyn", count: 8 },
  { name: "Tech Firms - SFO", count: 24 },
];

export function AppSidebar() {
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
              {savedLists.map((list) => (
                <SidebarMenuItem key={list.name}>
                  <SidebarMenuButton tooltip={list.name} className="text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                    <FolderOpen className="h-4 w-4" />
                    <span>{list.name}</span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                      {list.count}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="New List" className="text-accent hover:text-accent-foreground">
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
              <AvatarImage src="https://picsum.photos/seed/user/100/100" />
              <AvatarFallback>CF</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold truncate text-white">John Doe</span>
              <span className="text-xs text-sidebar-foreground/70 truncate leading-none">john@clientsfinding.com</span>
            </div>
            <Settings className="h-5 w-5 ml-auto text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

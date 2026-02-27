"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-collection";
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
import { Star, MapPin, Phone, Globe, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedLeadsViewProps {
  listId: string | null;
}

export function SavedLeadsView({ listId }: SavedLeadsViewProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const path = listId 
      ? `users/${user.uid}/lists/${listId}/leads`
      : `users/${user.uid}/lists/general/leads`;
    return query(collection(db, path), orderBy("savedAt", "desc"));
  }, [db, user, listId]);

  const { data: leads, loading } = useCollection(leadsQuery);

  const handleDeleteLead = async (leadId: string) => {
    if (!db || !user) return;
    const activeListId = listId || "general";
    const leadRef = doc(db, "users", user.uid, "lists", activeListId, "leads", leadId);
    const listRef = doc(db, "users", user.uid, "lists", activeListId);

    try {
      await deleteDoc(leadRef);
      await updateDoc(listRef, {
        count: increment(-1)
      });
      toast({ title: "Lead Removed", description: "Business removed from list." });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
        <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <Star className="h-10 w-10 text-slate-200" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No saved leads yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Go back to Search to find local businesses and save them to your lists.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <div className="p-8 border-b shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Saved Leads</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage and export your gathered business data.</p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-4 font-bold border-primary/20 text-primary bg-primary/5">
          {leads.length} Leads in this list
        </Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[300px]">Business Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-bold text-slate-900">
                  <div className="flex flex-col">
                    <span>{lead.name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {lead.address}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">{lead.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </div>
                    {lead.website && (
                      <div 
                        className="flex items-center gap-2 text-xs text-primary hover:underline cursor-pointer"
                        onClick={() => window.open(lead.website)}
                      >
                        <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-sm">{lead.rating}</span>
                    <span className="text-xs text-muted-foreground">({lead.reviews})</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
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

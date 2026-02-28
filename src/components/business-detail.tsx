
"use client";

import { Business } from "@/app/page";
import { 
  X, 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  PlusCircle, 
  Share2, 
  ChevronLeft,
  Mail,
  Calendar,
  Building2,
  ShieldCheck,
  ChevronDown,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, increment, runTransaction } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

interface BusinessDetailProps {
  business: Business;
  onClose: () => void;
}

export function BusinessDetail({ business: initialBusiness, onClose }: BusinessDetailProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const map = useMap();
  const placesLibrary = useMapsLibrary("places");
  
  const [business, setBusiness] = useState<Business>(initialBusiness);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Deep fetch details (Phone/Website) when business is selected
  useEffect(() => {
    if (!placesLibrary || !map || !initialBusiness.id) return;

    setIsLoadingDetails(true);
    const service = new placesLibrary.PlacesService(map);
    
    service.getDetails({
      placeId: initialBusiness.id,
      fields: ['formatted_phone_number', 'website', 'formatted_address', 'name', 'rating', 'user_ratings_total']
    }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result) {
        setBusiness(prev => ({
          ...prev,
          phone: result.formatted_phone_number || prev.phone,
          website: result.website || prev.website,
          address: result.formatted_address || prev.address,
        }));
      }
      setIsLoadingDetails(false);
    });
  }, [initialBusiness.id, placesLibrary, map]);

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "leadLists");
  }, [db, user]);

  const { data: userLists } = useCollection(listsQuery);

  const handleSaveLead = async (listId: string = "general", listName: string = "General Leads") => {
    if (!db || !user) return;
    
    setIsSaving(true);
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    const leadRef = doc(db, "users", user.uid, "leadLists", listId, "leads", business.id);

    try {
      await runTransaction(db, async (transaction) => {
        const listDoc = await transaction.get(listRef);
        
        if (!listDoc.exists()) {
          transaction.set(listRef, {
            id: listId,
            name: listName,
            userId: user.uid,
            count: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          transaction.update(listRef, {
            count: increment(1),
            updatedAt: serverTimestamp()
          });
        }
        
        transaction.set(leadRef, {
          id: business.id,
          name: business.name,
          address: business.address,
          phoneNumber: business.phone,
          category: business.category,
          rating: business.rating,
          reviews: business.reviews,
          website: business.website || "",
          email: business.email || "",
          savedAt: serverTimestamp(),
        });
      });

      toast({
        title: "Lead Saved",
        description: `${business.name} added to "${listName}".`,
      });
    } catch (err: any) {
      const permissionError = new FirestorePermissionError({
        path: leadRef.path,
        operation: 'write',
        requestResourceData: business,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="p-4 border-b flex items-center justify-between shrink-0 bg-slate-50/80">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"><Share2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="relative h-48 bg-slate-200 overflow-hidden">
          <Image 
            src={`https://picsum.photos/seed/${business.id}/600/300`} 
            alt={business.name}
            width={600}
            height={300}
            className="object-cover w-full h-full"
            data-ai-hint="business exterior"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="mb-2 bg-secondary text-secondary-foreground border-none font-bold">
              {business.category}
            </Badge>
            <h1 className="text-xl font-bold text-white leading-tight">{business.name}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 text-center min-w-[64px]">
              <div className="text-2xl font-bold text-primary">{business.rating}</div>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={cn("h-2.5 w-2.5", i < Math.floor(business.rating) ? "fill-primary text-primary" : "text-muted")} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">{business.reviews} Reviews</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-green-500" /> Verified Business
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex gap-2">
              <Button 
                className="flex-1 rounded-xl py-6 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95" 
                onClick={() => handleSaveLead("general", "General Leads")}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                Quick Save
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-3 rounded-xl border-slate-200" disabled={isSaving}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase">Save to List</div>
                  {userLists && userLists.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground italic">No custom lists yet</div>
                  )}
                  {userLists?.map(list => (
                    <DropdownMenuItem key={list.id} onClick={() => handleSaveLead(list.id, list.name)}>
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => toast({ title: "Tip", description: "Use the sidebar to create new lists." })}>
                    <PlusCircle className="h-4 w-4 mr-2" /> New List...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Button variant="outline" className="w-full border-slate-200 rounded-xl py-6" onClick={() => window.open(`mailto:${business.email || ''}`)}>
              <Mail className="h-4 w-4 mr-2" /> Contact via Email
            </Button>
          </div>

          <Separator className="mb-6 opacity-50" />

          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-3 w-3" /> Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><MapPin className="h-4 w-4 text-slate-600" /></div>
                  <div className="text-sm">{business.address}</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Phone className="h-4 w-4 text-slate-600" /></div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {isLoadingDetails ? (
                      <span className="text-muted-foreground animate-pulse">Loading phone...</span>
                    ) : (
                      business.phone || "No phone listed"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Globe className="h-4 w-4 text-slate-600" /></div>
                  <div className="text-sm text-primary hover:underline cursor-pointer font-medium flex items-center gap-2">
                    {isLoadingDetails ? (
                      <span className="text-muted-foreground animate-pulse">Loading website...</span>
                    ) : (
                      business.website ? (
                        <span onClick={() => window.open(business.website, '_blank')}>
                          {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      ) : "No website available"
                    )}
                  </div>
                </div>

                {business.email && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Mail className="h-4 w-4 text-slate-600" /></div>
                    <div className="text-sm text-primary hover:underline cursor-pointer font-medium" onClick={() => window.open(`mailto:${business.email}`)}>
                      {business.email}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-slate-50 shrink-0">
        <Button variant="outline" className="w-full bg-white border-slate-200 hover:bg-slate-50" onClick={() => toast({ title: "Feature locked", description: "Meeting scheduler requires Pro plan." })}>
          <Calendar className="h-4 w-4 mr-2 text-secondary" /> Schedule a Meeting
        </Button>
      </div>
    </div>
  );
}

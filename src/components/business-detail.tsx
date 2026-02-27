
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
  MessageSquare,
  ShieldCheck,
  Building2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface BusinessDetailProps {
  business: Business;
  onClose: () => void;
}

export function BusinessDetail({ business, onClose }: BusinessDetailProps) {
  const { toast } = useToast();

  const handleSaveLead = () => {
    toast({
      title: "Lead Saved",
      description: `${business.name} added to "My New Leads" list.`,
    });
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
        {/* Business Header Image/Visual */}
        <div className="relative h-48 bg-slate-200 overflow-hidden">
          <Image 
            src={`https://picsum.photos/seed/${business.id}/600/300`} 
            alt={business.name}
            fill
            className="object-cover"
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
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
              <div className="text-2xl font-bold text-primary">{business.rating}</div>
              <div className="flex items-center gap-0.5 mt-0.5">
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

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button className="w-full bg-primary hover:bg-primary/90 rounded-xl py-6" onClick={handleSaveLead}>
              <PlusCircle className="h-4 w-4 mr-2" /> Save Lead
            </Button>
            <Button variant="outline" className="w-full border-slate-200 rounded-xl py-6">
              <Mail className="h-4 w-4 mr-2" /> Contact
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
                  <div className="text-sm leading-relaxed">{business.address}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Phone className="h-4 w-4 text-slate-600" /></div>
                  <div className="text-sm">{business.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Globe className="h-4 w-4 text-slate-600" /></div>
                  <div className="text-sm text-primary hover:underline cursor-pointer font-medium">{business.website?.replace('https://', '')}</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Business Hours
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center"><span className="font-medium">Mon - Fri</span><span>08:00 AM - 06:00 PM</span></div>
                <div className="flex justify-between items-center"><span className="font-medium">Sat</span><span>09:00 AM - 04:00 PM</span></div>
                <div className="flex justify-between items-center text-muted-foreground"><span className="font-medium">Sun</span><span>Closed</span></div>
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-slate-50 shrink-0">
        <Button variant="outline" className="w-full bg-white border-slate-200 hover:bg-slate-50">
          <Calendar className="h-4 w-4 mr-2 text-secondary" /> Schedule a Meeting
        </Button>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

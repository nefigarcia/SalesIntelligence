
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
  Building2,
  ShieldCheck,
  ChevronDown,
  Loader2,
  Users,
  Copy,
  ExternalLink,
  Search,
  Linkedin,
  AlertCircle,
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
import { findPeopleAtDomain, type PeopleFinderResult } from "@/lib/people-finder";

type Tab = "overview" | "people" | "outreach";

const OUTREACH_TEMPLATES = [
  {
    id: "cold",
    label: "Cold Outreach",
    subject: (name: string) => `Quick question for ${name}`,
    body: (name: string) =>
      `Hi there,\n\nI came across ${name} and was impressed by what you're doing.\n\nI help local businesses like yours find more clients through targeted digital strategies — and I think there's a real opportunity for ${name}.\n\nWould you be open to a quick 15-minute call this week to explore if there's a fit?\n\nBest,\n[Your Name]`,
  },
  {
    id: "followup",
    label: "Follow-Up",
    subject: (name: string) => `Following up — ${name}`,
    body: (name: string) =>
      `Hi,\n\nI wanted to follow up on my previous message about ${name}.\n\nI know inboxes get busy — I just wanted to make sure my note didn't get lost. I'd love to share a few ideas that have worked really well for businesses in your space.\n\nHappy to keep it to 10 minutes — does any time this week work for you?\n\nBest,\n[Your Name]`,
  },
  {
    id: "partnership",
    label: "Partnership",
    subject: (name: string) => `Partnership opportunity — ${name}`,
    body: (name: string) =>
      `Hi,\n\nI'm reaching out because I believe there's a great opportunity for a mutually beneficial partnership between our businesses.\n\n${name} and our team serve similar audiences, and I think we could refer clients to each other in a way that helps us both grow.\n\nWould love to connect — are you available for a brief call this week?\n\nBest,\n[Your Name]`,
  },
];

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
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [peopleResult, setPeopleResult] = useState<PeopleFinderResult | null>(null);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  useEffect(() => {
    if (!placesLibrary || !map || !initialBusiness.id) return;
    setIsLoadingDetails(true);
    const service = new placesLibrary.PlacesService(map);
    service.getDetails({
      placeId: initialBusiness.id,
      fields: ['formatted_phone_number', 'website', 'formatted_address', 'name', 'rating', 'user_ratings_total'],
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

  // Load people when tab is opened
  useEffect(() => {
    if (activeTab !== "people" || peopleResult !== null) return;
    if (!business.website) {
      setPeopleResult({ people: [], hasApiKey: false, error: "No website available" });
      return;
    }
    setIsLoadingPeople(true);
    findPeopleAtDomain(business.website)
      .then(setPeopleResult)
      .finally(() => setIsLoadingPeople(false));
  }, [activeTab, business.website, peopleResult]);

  const listsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "leadLists");
  }, [db, user]);

  const { data: userLists } = useCollection(listsQuery);

  const handleSaveLead = async (listId = "general", listName = "General Leads") => {
    if (!db || !user) return;
    setIsSaving(true);
    const listRef = doc(db, "users", user.uid, "leadLists", listId);
    const leadRef = doc(db, "users", user.uid, "leadLists", listId, "leads", business.id);
    try {
      await runTransaction(db, async (transaction) => {
        const listDoc = await transaction.get(listRef);
        if (!listDoc.exists()) {
          transaction.set(listRef, { id: listId, name: listName, userId: user.uid, count: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } else {
          transaction.update(listRef, { count: increment(1), updatedAt: serverTimestamp() });
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
          status: "new",
          savedAt: serverTimestamp(),
        });
      });
      toast({ title: "Lead Saved", description: `${business.name} added to "${listName}".` });
    } catch {
      const permissionError = new FirestorePermissionError({ path: leadRef.path, operation: 'write', requestResourceData: business });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const template = OUTREACH_TEMPLATES[selectedTemplate];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Top bar */}
      <div className="p-4 border-b flex items-center justify-between shrink-0 bg-slate-50/80">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-36 bg-slate-200 overflow-hidden shrink-0">
        <Image
          src={`https://picsum.photos/seed/${business.id}/600/300`}
          alt={business.name}
          width={600} height={300}
          className="object-cover w-full h-full"
          data-ai-hint="business exterior"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <Badge className="mb-1 bg-secondary text-secondary-foreground border-none font-bold text-[10px]">
            {business.category}
          </Badge>
          <h1 className="text-lg font-bold text-white leading-tight">{business.name}</h1>
        </div>
      </div>

      {/* Rating + Save bar */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-black text-sm">{business.rating ?? "—"}</span>
          <span className="text-xs text-muted-foreground">({business.reviews ?? 0})</span>
        </div>
        <div className="flex-1" />
        <Button
          className="h-8 px-4 rounded-full text-xs font-bold"
          onClick={() => handleSaveLead("general", "General Leads")}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <PlusCircle className="h-3 w-3 mr-1" />}
          Quick Save
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 px-2 rounded-full border-slate-200" disabled={isSaving}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase">Save to List</div>
            {userLists?.map(list => (
              <DropdownMenuItem key={list.id} onClick={() => handleSaveLead(list.id, list.name)}>
                {list.name}
              </DropdownMenuItem>
            ))}
            <Separator className="my-1" />
            <DropdownMenuItem onClick={() => toast({ title: "Create a list in the sidebar first." })}>
              <PlusCircle className="h-4 w-4 mr-2" /> New List...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0 bg-white">
        {(["overview", "people", "outreach"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab === "overview" && "Overview"}
            {tab === "people" && "People"}
            {tab === "outreach" && "Outreach"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="p-5 space-y-5">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Contact Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><MapPin className="h-4 w-4 text-slate-500" /></div>
                  <div className="text-sm text-slate-700 pt-1">{business.address}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Phone className="h-4 w-4 text-slate-500" /></div>
                  <div className="text-sm font-medium flex items-center gap-2 flex-1">
                    {isLoadingDetails
                      ? <span className="text-muted-foreground animate-pulse text-xs">Loading...</span>
                      : <span>{business.phone || "No phone listed"}</span>
                    }
                    {business.phone && (
                      <button onClick={() => copyToClipboard(business.phone, "Phone copied")} className="text-slate-300 hover:text-slate-500">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Globe className="h-4 w-4 text-slate-500" /></div>
                  <div className="text-sm font-medium flex items-center gap-2 flex-1 overflow-hidden">
                    {isLoadingDetails
                      ? <span className="text-muted-foreground animate-pulse text-xs">Loading...</span>
                      : business.website
                        ? (
                          <>
                            <span
                              className="text-primary hover:underline cursor-pointer truncate"
                              onClick={() => window.open(business.website, '_blank')}
                            >
                              {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                            <a href={business.website} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-slate-500 shrink-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )
                        : <span className="text-slate-400">No website</span>
                    }
                  </div>
                </div>
                {business.email && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg shrink-0"><Mail className="h-4 w-4 text-slate-500" /></div>
                    <div className="text-sm font-medium text-primary hover:underline cursor-pointer" onClick={() => window.open(`mailto:${business.email}`)}>
                      {business.email}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator className="opacity-40" />

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Quick Intel
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Est. Size",
                    value: business.reviews
                      ? business.reviews > 200 ? "Large" : business.reviews > 50 ? "Medium" : business.reviews > 10 ? "Small" : "Micro"
                      : "Unknown",
                  },
                  {
                    label: "Rating Tier",
                    value: (business.rating ?? 0) >= 4.5 ? "Top Rated" : (business.rating ?? 0) >= 4 ? "Good" : "Average",
                  },
                  { label: "Reviews", value: business.reviews?.toLocaleString() ?? "N/A" },
                  { label: "Category", value: (business.category || "Business").replace(/_/g, " ") },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                    <div className="text-sm font-bold text-slate-700 capitalize">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* PEOPLE TAB */}
        {activeTab === "people" && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                <Users className="h-4 w-4" /> Decision Makers
              </h3>
              <p className="text-xs text-muted-foreground">
                Find key contacts at {business.name} using Hunter.io domain search.
              </p>
            </div>

            {isLoadingPeople && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching contacts...
              </div>
            )}

            {!isLoadingPeople && peopleResult && !peopleResult.hasApiKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Hunter.io API Key Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Add <code className="bg-amber-100 px-1 rounded">HUNTER_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> to find verified contacts and emails at any company.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => window.open('https://hunter.io/api', '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> Get Free API Key (25 searches/mo)
                </Button>
              </div>
            )}

            {!isLoadingPeople && peopleResult?.hasApiKey && peopleResult.error && (
              <div className="text-sm text-muted-foreground bg-slate-50 rounded-xl p-4 border border-slate-100">
                {peopleResult.error}
              </div>
            )}

            {!isLoadingPeople && peopleResult?.hasApiKey && !peopleResult.error && (
              <>
                {/* Company intel from Hunter */}
                {(peopleResult.companySize || peopleResult.industry) && (
                  <div className="grid grid-cols-2 gap-3">
                    {peopleResult.companySize && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Company Size</div>
                        <div className="text-sm font-bold text-slate-700">{peopleResult.companySize}</div>
                      </div>
                    )}
                    {peopleResult.industry && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Industry</div>
                        <div className="text-sm font-bold text-slate-700 capitalize">{peopleResult.industry}</div>
                      </div>
                    )}
                  </div>
                )}

                {peopleResult.people.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No contacts found for this domain.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {peopleResult.people.map((person, i) => (
                      <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{person.name}</div>
                            {person.title && (
                              <div className="text-xs text-slate-500 mt-0.5">{person.title}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {person.confidence && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-black border-none",
                                  person.confidence >= 80 ? "bg-green-50 text-green-700" :
                                  person.confidence >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-slate-50 text-slate-400"
                                )}
                              >
                                {person.confidence}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                        {person.email && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                            <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-indigo-700 flex-1 truncate">{person.email}</span>
                            <button onClick={() => copyToClipboard(person.email!, "Email copied")} className="text-slate-300 hover:text-slate-500 shrink-0">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {person.linkedin && (
                          <a href={person.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-600 hover:underline">
                            <Linkedin className="h-3 w-3" /> LinkedIn Profile
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Separator className="opacity-40" />

            {/* Manual search fallbacks */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Manual Search</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-xl border-slate-200 text-xs font-bold"
                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${business.name} owner manager email`)}`, '_blank')}
                >
                  <Search className="h-3.5 w-3.5 mr-2 text-slate-400" /> Google: {business.name} owner/manager
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-xl border-slate-200 text-xs font-bold"
                  onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(business.name)}`, '_blank')}
                >
                  <Linkedin className="h-3.5 w-3.5 mr-2 text-blue-600" /> LinkedIn: Find people at {business.name}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* OUTREACH TAB */}
        {activeTab === "outreach" && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email Templates
              </h3>
              <p className="text-xs text-muted-foreground">
                Ready-to-send outreach for {business.name}.
              </p>
            </div>

            {/* Template selector */}
            <div className="flex gap-2">
              {OUTREACH_TEMPLATES.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(i)}
                  className={cn(
                    "flex-1 text-[10px] font-black uppercase tracking-widest py-2 px-3 rounded-xl border transition-all",
                    selectedTemplate === i
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Subject */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subject Line</span>
                <button
                  onClick={() => copyToClipboard(template.subject(business.name), "Subject copied")}
                  className="text-[10px] font-bold text-slate-400 hover:text-primary flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="text-sm font-bold text-slate-800">{template.subject(business.name)}</p>
            </div>

            {/* Body */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Body</span>
                <button
                  onClick={() => copyToClipboard(template.body(business.name), "Email body copied")}
                  className="text-[10px] font-bold text-slate-400 hover:text-primary flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{template.body(business.name)}</p>
            </div>

            {business.email && (
              <Button
                className="w-full rounded-xl py-5 font-bold"
                onClick={() => window.open(`mailto:${business.email}?subject=${encodeURIComponent(template.subject(business.name))}&body=${encodeURIComponent(template.body(business.name))}`)}
              >
                <Mail className="h-4 w-4 mr-2" /> Open in Email Client
              </Button>
            )}

            {!business.email && (
              <div className="text-xs text-center text-slate-400 bg-slate-50 rounded-xl p-3 border border-dashed border-slate-200">
                Save this lead and run enrichment to find their email address.
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  children: React.ReactNode;
  hasResults?: boolean;
  className?: string;
}

// Simple draggable bottom sheet with three snap positions: collapsed, mid, full.
export function BottomSheet({ children, hasResults = false, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const startTranslate = useRef(0);
  const [translate, setTranslate] = useState(0); // px translateY from top of viewport
  const [height, setHeight] = useState(0);
  const [snapping, setSnapping] = useState(true);

  // Preset snap offsets (distance from top). We'll compute them on mount.
  const snapOffsets = useRef<{ full: number; mid: number; collapsed: number }>({ full: 0, mid: 0, collapsed: 0 });

  useEffect(() => {
    const onResize = () => {
      const vh = window.innerHeight;
      const full = 64; // top padding when full
      const mid = Math.round(vh * 0.45);
      const collapsed = Math.round(vh - 120); // show small peek (approx 120px visible)
      snapOffsets.current = { full, mid, collapsed };
      setHeight(vh - full);
      // determine initial position: if results, snap to mid, else collapsed
      const initial = hasResults ? mid : collapsed;
      setTranslate(initial);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hasResults]);

  // Update sheet position when results appear/disappear
  useEffect(() => {
    const target = hasResults ? snapOffsets.current.mid : snapOffsets.current.collapsed;
    setSnapping(true);
    setTranslate(target);
    const t = setTimeout(() => setSnapping(false), 250);
    return () => clearTimeout(t);
  }, [hasResults]);

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startTranslate.current = translate;
    setSnapping(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startY.current) return;
    const dy = e.clientY - startY.current;
    const newTranslate = Math.max(0, startTranslate.current + dy);
    setTranslate(newTranslate);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    startY.current = 0;
    // choose nearest snap
    const { full, mid, collapsed } = snapOffsets.current;
    const distances = [ {k: 'full', v: full, d: Math.abs(translate - full)}, {k: 'mid', v: mid, d: Math.abs(translate - mid)}, {k: 'collapsed', v: collapsed, d: Math.abs(translate - collapsed)} ];
    distances.sort((a,b)=>a.d-b.d);
    const target = (distances[0].v) as number;
    setSnapping(true);
    setTranslate(target);
    const t = setTimeout(() => setSnapping(false), 260);
    return () => clearTimeout(t);
  };

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${translate}px)`,
    transition: snapping ? "transform 220ms cubic-bezier(.22,.9,.33,1)" : undefined,
  };

  return (
    // Use a z-index lower than the header (header uses z-20) so the
    // top header remains interactive when the sheet overlaps it.
    <div className={cn("fixed inset-x-0 bottom-0 z-10 md:hidden pointer-events-none", className)} aria-hidden>
      <div
        ref={sheetRef}
        style={sheetStyle}
        className="mx-auto max-w-full rounded-t-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden touch-none pointer-events-auto"
      >
        {/* handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="w-full px-4 py-3 cursor-grab touch-pan-y"
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        <div className="h-[calc(100vh-64px)] overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="h-full overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;

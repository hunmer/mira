"use client";

import IrisLensCard from "@/components/ui/iris-lens-card";
import { Button } from "@/components/ui/button";

export default function IrisLensCardDemo() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <IrisLensCard
        className="w-full"
        heightClass="h-[360px]"
        tilt={18}
        contentDepth={30}
        lensStrength={1}
        holoEdge
      >
        <div className="flex h-full flex-col justify-end gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Iris Lens Card</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Liquid, cursor‑tracked highlights + spectral ridges. Tilt to feel the depth.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="outline">
              Secondary
            </Button>
          </div>
        </div>
      </IrisLensCard>
    </main>
  );
}

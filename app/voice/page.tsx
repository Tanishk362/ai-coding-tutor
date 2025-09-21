"use client";

import React, { Suspense } from "react";
import VoiceChat from "@/src/components/VoiceChat";

export const dynamic = "force-dynamic";

export default function VoicePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <VoiceChat />
    </Suspense>
  );
}

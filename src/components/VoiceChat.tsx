"use client";

import React from "react";

// Stub component: Voice features have been removed from the frontend in this codespace.
export default function VoiceChat() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">Voice Chat (Disabled)</h1>
      <p className="text-sm text-gray-400">
        Voice recognition, WebSocket audio streaming, and TTS have been removed from this environment.
        This page remains as a placeholder so links don’t break.
      </p>
      <p className="text-sm text-gray-400">
        You can continue chatting via the standard text UI under <code>/c/[slug]</code>.
      </p>
    </div>
  );
}

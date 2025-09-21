"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type Lang = "en" | "hi";

interface ChatMessage {
  role: Role;
  content: string;
}

function isSpeechRecognitionAvailable() {
  return typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
}

function isSpeechSynthesisAvailable() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

export default function VoiceChat() {
  const [lang, setLang] = useState<Lang>("en");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [botReply, setBotReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const speakingRef = useRef(false);

  const srSupported = isSpeechRecognitionAvailable();
  const ttsSupported = isSpeechSynthesisAvailable();

  const locale = useMemo(() => (lang === "hi" ? "hi-IN" : "en-US"), [lang]);

  // Initialize SpeechRecognition on demand
  const initRecognition = useCallback(() => {
    if (!srSupported) return null;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = locale;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    return rec;
  }, [srSupported, locale]);

  const speak = useCallback((text: string) => {
    if (!ttsSupported || !text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = locale;
    speakingRef.current = true;
    utter.onend = () => {
      speakingRef.current = false;
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [ttsSupported, locale]);

  const sendToChat = useCallback(async (userText: string) => {
    try {
      setError(null);
      const newMsgs: ChatMessage[] = [...messages, { role: "user", content: userText }];
      setMessages(newMsgs);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", lang, messages: newMsgs }),
      });
      if (!res.ok) {
        throw new Error(`Chat API error ${res.status}`);
      }
      const data = await res.json();
      const reply: string = data.reply || "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setBotReply(reply);
      speak(reply);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to contact chat API");
    }
  }, [lang, messages, speak]);

  const startListening = useCallback(() => {
    if (!srSupported || listening) return;
    const rec = initRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    try {
      rec.onresult = (event: any) => {
        const text = event?.results?.[0]?.[0]?.transcript || "";
        setTranscript(text);
        if (text.trim()) {
          void sendToChat(text.trim());
        }
      };
      rec.onerror = (event: any) => {
        console.error("SpeechRecognition error", event);
        setError("Voice recognition error. Please try again.");
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };
      setListening(true);
      rec.start();
    } catch (err) {
      console.error(err);
      setError("Could not start microphone. Check permissions.");
      setListening(false);
    }
  }, [srSupported, listening, initRecognition, sendToChat]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec && typeof rec.stop === "function") {
      try { rec.stop(); } catch {}
    }
    setListening(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    await sendToChat(transcript.trim());
    setTranscript("");
  }, [transcript, sendToChat]);

  useEffect(() => {
    return () => {
      // Cleanup
      try { window.speechSynthesis?.cancel(); } catch {}
      const rec = recognitionRef.current;
      if (rec && typeof rec.abort === "function") {
        try { rec.abort(); } catch {}
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Voice Chat</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Language</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="border rounded px-2 py-1 bg-transparent"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </div>

      {!srSupported && (
        <div className="text-amber-500 text-sm">
          Your browser does not support Speech Recognition. You can still type below.
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={startListening}
          disabled={!srSupported || listening}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {listening ? "Listening…" : "Start Mic"}
        </button>
        <button
          type="button"
          onClick={stopListening}
          disabled={!listening}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={() => ttsSupported && speak(botReply)}
          disabled={!ttsSupported || !botReply}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Replay Reply 🔊
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Speak or type your question…"
          className="flex-1 border rounded px-3 py-2 bg-transparent"
        />
        <button type="submit" className="px-3 py-2 border rounded">Send</button>
      </form>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold mr-1">{m.role === "user" ? "You" : m.role === "assistant" ? "Bot" : "Sys"}:</span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

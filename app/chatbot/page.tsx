
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getChatbotById, type Chatbot } from '../api/chat/supabaseClient';

interface Message {
  text: string;
  image?: string | null;
}

// Exporting a plain function instead of a React.FC constant helps Next.js
// infer the correct App Router types for the page and avoids type mismatch
// errors in the generated .next/types/validator.ts.
export default function PremiumChatbot() {
  const searchParams = useSearchParams();
  const botIdParam = searchParams.get('botId');
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!botIdParam) return;
      const id = Number(botIdParam);
      if (Number.isNaN(id)) return;
      const bot = await getChatbotById(id);
      setChatbot(bot);
    };
    load();
  }, [botIdParam]);

  const handleSend = () => {
    if (input.trim() || image) {
      setMessages([...messages, { text: input, image }]);
      setInput('');
      setImage(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
      padding: '32px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', fontWeight: 700, fontSize: '2rem', marginBottom: '24px', color: '#6366f1' }}>
        {chatbot?.name || 'Premium Chatbot'}
      </h1>
      <div style={{ minHeight: '300px', marginBottom: '24px', background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>
        {messages.length === 0 && <p style={{ color: '#a1a1aa', textAlign: 'center' }}>Start the conversation...</p>}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {msg.image && <img src={msg.image} alt="uploaded" style={{ maxWidth: '120px', borderRadius: '8px', marginBottom: '8px' }} />}
            <span style={{ background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '16px', fontWeight: 500 }}>{msg.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1rem' }}
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}
        >
          Upload Image
        </button>
        <button
          type="button"
          onClick={handleSend}
          style={{ background: '#22d3ee', color: '#fff', border: 'none', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

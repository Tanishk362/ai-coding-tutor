"use client";

import React, { useEffect, useState } from 'react';
import { createChatbot, getChatbots, deleteChatbot, updateChatbot, type Chatbot } from '../api/chat/supabaseClient';

export default function AdminPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; logic: string; instructions: string }>({ name: '', logic: '', instructions: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getChatbots();
        setChatbots(data);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load chatbots');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onCreate: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createChatbot(form.name, form.logic, form.instructions);
      setChatbots((prev) => [...prev, ...created]);
      setForm({ name: '', logic: '', instructions: '' });
    } catch (e: any) {
      setError(e.message ?? 'Failed to create chatbot');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id?: number) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await deleteChatbot(id);
      setChatbots((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete chatbot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin - Chatbot Builder</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={onCreate} className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input name="name" value={form.name} onChange={onChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Logic</label>
          <textarea name="logic" value={form.logic} onChange={onChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Instructions</label>
          <textarea name="instructions" value={form.instructions} onChange={onChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded">
          {loading ? 'Saving...' : 'Create Chatbot'}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Existing Chatbots</h2>
      {loading && chatbots.length === 0 ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-3">
          {chatbots.map((bot) => (
            <li key={bot.id} className="border rounded p-3">
              <div className="font-semibold">{bot.name}</div>
              <div className="text-sm text-gray-600">Logic: {bot.logic}</div>
              <div className="text-sm text-gray-600">Instructions: {bot.instructions}</div>
              <div className="mt-2 flex gap-3">
                <button onClick={() => onDelete(bot.id)} className="text-red-600 underline">Delete</button>
                <a href={`/chatbot?botId=${bot.id}`} className="text-indigo-600 underline">View Live Chatbot</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

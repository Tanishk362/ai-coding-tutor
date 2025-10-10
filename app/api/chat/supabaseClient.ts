"use client";

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazily create the client so we don't throw during build or import time on Vercel
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').toString();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').toString();
let supabase: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      // Throw only when the code path is actually executed at runtime, not at import/build time
      throw new Error(
        'Supabase env vars missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (e.g., Vercel Project Settings → Environment Variables).'
      );
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface Chatbot {
  // id may exist in the table; keep optional to avoid type friction
  id?: number;
  name: string;
  logic: string;
  instructions: string;
}

export const createChatbot = async (name: string, logic: string, instructions: string): Promise<Chatbot[]> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('chatbots')
    .insert([{ name, logic, instructions }])
    .select('*'); // return inserted rows

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getChatbotById = async (id: number): Promise<Chatbot | null> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // If no rows, Supabase may return an error; normalize to null
    if ((error as any).code === 'PGRST116' /* No rows returned */) return null;
    throw new Error(error.message);
  }

  return data ?? null;
};

export const getChatbots = async (): Promise<Chatbot[]> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('chatbots')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const updateChatbot = async (id: number, updates: Partial<Chatbot>): Promise<Chatbot[]> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('chatbots')
    .update(updates)
    .eq('id', id)
    .select('*'); // return updated rows

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const deleteChatbot = async (id: number): Promise<Chatbot[]> => {
  const supabase = ensureClient();
  const { data, error } = await supabase
    .from('chatbots')
    .delete()
    .eq('id', id)
    .select('*'); // return deleted rows

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

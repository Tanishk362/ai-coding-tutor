"use client";

import { createClient } from '@supabase/supabase-js';

// Ensure env vars are present and typed as strings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Chatbot {
  // id may exist in the table; keep optional to avoid type friction
  id?: number;
  name: string;
  logic: string;
  instructions: string;
}

export const createChatbot = async (name: string, logic: string, instructions: string): Promise<Chatbot[]> => {
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
  const { data, error } = await supabase
    .from('chatbots')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const updateChatbot = async (id: number, updates: Partial<Chatbot>): Promise<Chatbot[]> => {
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

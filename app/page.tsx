"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ⏱ Timer states
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour = 3600 sec
  const [isPaused, setIsPaused] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChat = chats.find((c) => c.id === currentChatId);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages?.length, loading]);

  // Load chats + theme
  useEffect(() => {
    const storedChats = localStorage.getItem("aiTutorChats");
    const lastChatId = localStorage.getItem("lastChatId");
    const storedDark = localStorage.getItem("darkMode");
    if (storedChats) {
      const parsed = JSON.parse(storedChats) as Chat[];
      setChats(parsed);
      if (parsed.length > 0) {
        const chatToOpen = parsed.find((c) => c.id === lastChatId) || parsed[0];
        setCurrentChatId(chatToOpen.id);
      }
    }
    if (storedDark) setDarkMode(storedDark === "true");
  }, []);

  // Save chats
  useEffect(() => {
    localStorage.setItem("aiTutorChats", JSON.stringify(chats));
  }, [chats]);

  // Save current chat id
  useEffect(() => {
    if (currentChatId) localStorage.setItem("lastChatId", currentChatId);
  }, [currentChatId]);

  // Save theme
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Timer countdown ⏳
  useEffect(() => {
    if (!timerStarted || isPaused) return;
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isPaused, timerStarted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteCurrentChat = () => {
    if (!currentChatId) return;
    const updated = chats.filter((c) => c.id !== currentChatId);
    setChats(updated);
    setCurrentChatId(updated.length > 0 ? updated[0].id : null);
  };

  const editCurrentChatName = () => {
    if (!currentChatId) return;
    const newName = prompt("Enter new chat name:", currentChat?.title || "");
    if (!newName) return;
    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChatId ? { ...c, title: newName } : c
      )
    );
  };

  const sendMessage = async (mode: "chat" | "explain" | "quiz_start") => {
    if (!input.trim() && mode === "chat") return;

    // ⏱ Start timer automatically on first message
    if (!timerStarted) {
      setTimerStarted(true);
      setTimeLeft(3600);
    }

    setLoading(true);
    try {
      let body: any = { mode, lang: "en" };

      if (mode === "chat") {
        const userMessage: Message = { role: "user", content: input };
        const updatedChats = chats.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, userMessage] }
            : chat
        );
        if (currentChat && currentChat.messages.length === 0) {
          const trimmedTitle =
            input.length > 30 ? input.slice(0, 30).trim() + "..." : input;
          updatedChats.find((c) => c.id === currentChatId)!.title = trimmedTitle;
        }
        setChats(updatedChats);
        setInput("");
        body.messages = [...(currentChat?.messages || []), userMessage];
      }

      if (mode === "explain") {
        body.idea = input;
        setInput("");
      }

      if (mode === "quiz_start") {
        body.topic = input || "basics";
        setInput("");
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      const aiMessage: Message =
        mode === "quiz_start"
          ? {
              role: "assistant",
              content: `**Practice Task:** ${data.question}\n\n**Hints:**\n${(
                data.hints || []
              ).join("\n")}`,
            }
          : {
              role: "assistant",
              content: data.reply || "⚠️ No reply",
            };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, aiMessage] }
            : chat
        )
      );

      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg: Message, i: number) => {
    const isUser = msg.role === "user";

    return (
      <div
        key={i}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
      >
        <div
          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
            isUser
              ? "bg-blue-500 text-white dark:bg-blue-600 rounded-br-none"
              : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white rounded-bl-none"
          }`}
        >
          {/**
           * React 19 type compatibility: react-markdown types lag behind,
           * so cast to any to avoid JSX/ReactNode incompatibilities.
           */}
          {(() => {
            const Markdown: any = ReactMarkdown;
            const components: any = {
              code({ inline, className, children }: any) {
                const language = /language-(\w+)/.exec(className || "");
                return !inline ? (
                  <CodeBlock
                    content={String(children).replace(/\n$/, "")}
                    language={language ? language[1] : "javascript"}
                  />
                ) : (
                  <code className="bg-black/20 px-1 rounded text-sm">
                    {children}
                  </code>
                );
              },
            };
            return (
              <Markdown components={components}>{msg.content}</Markdown>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <main
      className={`flex h-screen relative ${
        darkMode ? "bg-[#111] text-white" : "bg-gray-50 text-black"
      }`}
    >
      {/* Fullscreen Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <button
            onClick={() => setIsPaused(false)}
            className="px-6 py-3 text-2xl bg-red-500 text-white rounded-lg shadow-lg"
          >
            ▶ Resume
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64 border-r" : "w-0 border-none"
        } transition-all overflow-hidden flex flex-col ${
          darkMode ? "border-gray-700" : "border-gray-300"
        }`}
      >
        <div className="p-3 flex justify-between items-center border-b dark:border-gray-700 border-gray-300">
          <span className="font-bold">Tarik-Teacher</span>
          <button
            onClick={startNewChat}
            className="text-sm px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`p-2 cursor-pointer truncate ${
                chat.id === currentChatId
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {chat.title}
            </div>
          ))}
        </div>
        <div className="p-3 border-t dark:border-gray-700 border-gray-300 space-y-2">
          {/* Timer UI */}
          {timerStarted && (
            <div className="text-center text-sm font-mono">
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full text-sm px-2 py-1 border rounded"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <button
            onClick={editCurrentChatName}
            className="w-full text-sm px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            ✏️ Edit Chat Name
          </button>
          <button
            onClick={deleteCurrentChat}
            className="w-full text-sm px-2 py-1 border rounded hover:bg-red-500 hover:text-white"
          >
            🗑️ Delete Chat
          </button>
          {timerStarted && (
            <button
              onClick={() => setIsPaused(true)}
              className="w-full text-sm px-2 py-1 border rounded hover:bg-yellow-500 hover:text-white"
            >
              ⏸ Pause
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="p-3 border-b dark:border-gray-700 border-gray-300 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden px-2 py-1 border rounded"
          >
            ☰
          </button>
          <span className="font-semibold">
            {currentChat?.title || "Tarik-Teacher"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentChat?.messages.map((msg, i) => renderMessage(msg, i))}
          {loading && (
            <div className="flex items-center gap-1 text-gray-400 px-2 py-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce delay-150">•</span>
              <span className="animate-bounce delay-300">•</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {currentChat && (
          <div className="p-3 border-t dark:border-gray-700 border-gray-300 flex space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage("chat");
                }
              }}
              placeholder="Ask your AI Teacher..."
              className={`flex-1 px-3 py-2 rounded border focus:ring ${
                darkMode
                  ? "bg-[#222] border-gray-600 focus:ring-blue-600"
                  : "bg-white border-gray-300 focus:ring-blue-400"
              }`}
            />
            <button
              onClick={() => sendMessage("chat")}
              className="px-3 py-2 border rounded hover:bg-blue-500 hover:text-white"
            >
              Send
            </button>
            <button
              onClick={() => sendMessage("explain")}
              className="px-3 py-2 border rounded hover:bg-green-500 hover:text-white"
            >
              Explain Idea
            </button>
            <button
              onClick={() => sendMessage("quiz_start")}
              className="px-3 py-2 border rounded hover:bg-purple-500 hover:text-white"
            >
              Practice Task
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// Code block renderer
function CodeBlock({
  content,
  language = "javascript",
}: {
  content: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-1 right-1 text-xs px-2 py-0.5 border rounded bg-black/40 text-white"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        wrapLongLines
        customStyle={{
          fontSize: "0.8rem",
          borderRadius: "0.3rem",
          padding: "0.75rem",
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}

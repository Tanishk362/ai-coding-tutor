"use client";

import React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Log to console for developer visibility but don't hard-crash the UI
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.error("Global error:", error);
  }
  return (
    <html>
      <body className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-gray-400 text-sm">
            An unexpected error occurred while loading this page. You can try again.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => reset()}
              className="px-3 py-2 border rounded-md border-gray-700 hover:bg-[#141414]"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-3 py-2 border rounded-md border-gray-700 hover:bg-[#141414]"
            >
              Go home
            </a>
          </div>
          {error?.digest && (
            <p className="mt-3 text-xs text-gray-600">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}

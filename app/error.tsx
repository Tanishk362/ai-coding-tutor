"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.error("Root segment error:", error);
  }
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-gray-400 text-sm">Please try again.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="px-3 py-2 border rounded-md border-gray-700 hover:bg-[#141414]"
          >
            Retry
          </button>
          <a href="/" className="px-3 py-2 border rounded-md border-gray-700 hover:bg-[#141414]">Home</a>
        </div>
        {error?.digest && (
          <p className="mt-3 text-xs text-gray-600">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}

import { Suspense } from "react";
import ChatbotClient from "./ChatbotClient";

export default function PremiumChatbot() {
  return (
    <main>
      <Suspense fallback={<div>Loading…</div>}>
        <ChatbotClient />
      </Suspense>
    </main>
  );
}

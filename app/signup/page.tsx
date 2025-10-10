import { Suspense } from "react";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm fallbackNext="/admin/chatbots" />
      </Suspense>
    </main>
  );
}

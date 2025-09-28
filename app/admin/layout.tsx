"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const devNoAuth =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (devNoAuth) {
        // In dev/no-auth mode, allow access without Supabase session
        if (mounted) setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/admin/chatbots")}`);
      } else {
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, pathname, devNoAuth]);

  if (!ready) return null;
  return <>{children}</>;
}

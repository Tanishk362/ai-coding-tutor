"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
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
  }, [router, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}

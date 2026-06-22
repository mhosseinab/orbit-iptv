import { useEffect, useState } from "react";
import { pingProxy } from "../lib/proxy";

// Detect the same-origin Cloudflare Pages proxy once on mount. Stays false on
// plain static hosts (no /proxy function), and the player runs direct-only.
export function useProxy(): boolean {
  const [proxyOk, setProxyOk] = useState(false);
  useEffect(() => {
    let alive = true;
    pingProxy().then((ok) => {
      if (alive && ok) setProxyOk(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return proxyOk;
}

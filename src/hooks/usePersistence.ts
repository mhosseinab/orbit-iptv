import { useCallback, useState } from "react";
import type { Status, StatusEntry } from "../types/iptv";

const RECENT_CAP = 40;
const STATUS_CAP = 800;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / unavailable — ignore */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readJSON<string[]>("orbit.fav", [])),
  );

  const toggleFav = useCallback((url: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      writeJSON("orbit.fav", [...next]);
      return next;
    });
  }, []);

  return { favorites, toggleFav };
}

export function useRecent() {
  const [recent, setRecent] = useState<string[]>(() =>
    readJSON<string[]>("orbit.recent", []),
  );

  const pushRecent = useCallback((url: string) => {
    setRecent((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, RECENT_CAP);
      writeJSON("orbit.recent", next);
      return next;
    });
  }, []);

  return { recent, pushRecent };
}

export function useStatusCache() {
  const [statusByUrl, setStatusByUrl] = useState<Map<string, StatusEntry>>(
    () => new Map(Object.entries(readJSON<Record<string, StatusEntry>>("orbit.status", {}))),
  );

  const setStatus = useCallback((url: string, status: Status) => {
    setStatusByUrl((prev) => {
      const next = new Map(prev);
      next.delete(url); // re-insert at the end = most-recently-touched
      next.set(url, { status, ts: Date.now() });
      while (next.size > STATUS_CAP) {
        const oldest = next.keys().next().value;
        if (oldest === undefined) break;
        next.delete(oldest);
      }
      writeJSON("orbit.status", Object.fromEntries(next));
      return next;
    });
  }, []);

  return { statusByUrl, setStatus };
}

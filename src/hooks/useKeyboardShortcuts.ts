import { useEffect } from "react";

interface Handlers {
  onSearch: () => void;
  onTogglePlay: () => void;
  onFullscreen: () => void;
  onMute: () => void;
  onEscape: () => void;
  onNav: (dir: 1 | -1) => void;
}

// Global shortcuts: / search, space play/pause, f fullscreen, m mute,
// esc close, ↑/↓ navigate the list. Ignored while typing in a field.
export function useKeyboardShortcuts(h: Handlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        h.onSearch();
      } else if (e.key === " ") {
        e.preventDefault();
        h.onTogglePlay();
      } else if (e.key.toLowerCase() === "f") {
        h.onFullscreen();
      } else if (e.key.toLowerCase() === "m") {
        h.onMute();
      } else if (e.key === "Escape") {
        h.onEscape();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        h.onNav(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        h.onNav(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [h]);
}

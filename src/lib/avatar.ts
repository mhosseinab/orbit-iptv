// Deterministic fallback avatar for channels with no logo.

export function avatarColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg,hsl(${hue} 55% 32%),hsl(${(hue + 40) % 360} 55% 22%))`;
}

export function initials(name: string): string {
  return (
    (name || "?")
      .replace(/[^A-Za-z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

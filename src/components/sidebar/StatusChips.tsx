import type { StatusFilter } from "../../types/iptv";
import styles from "./StatusChips.module.css";

const CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "playable", label: "Playable" },
  { value: "geo", label: "Geo" },
  { value: "restricted", label: "Restricted" },
  { value: "fav", label: "Favorites" },
  { value: "recent", label: "Recent" },
];

export function StatusChips({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  return (
    <div className={styles.chips} role="tablist" aria-label="Status filter">
      {CHIPS.map((c) => (
        <button
          key={c.value || "all"}
          className={`${styles.chip} ${value === c.value ? styles.active : ""}`}
          onClick={() => onChange(c.value)}
          role="tab"
          aria-selected={value === c.value}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

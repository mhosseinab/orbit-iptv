import { memo } from "react";
import { Avatar } from "../common/Avatar";
import { Icon } from "../common/Icon";
import { statusMeta } from "../../lib/status";
import type { Status, StreamRecord } from "../../types/iptv";
import styles from "./ChannelRow.module.css";

interface Props {
  record: StreamRecord;
  active: boolean;
  fav: boolean;
  logo?: string;
  status: Status | null;
  onSelect: (r: StreamRecord) => void;
  onToggleFav: (url: string) => void;
}

function ChannelRowBase({ record, active, fav, logo, status, onSelect, onToggleFav }: Props) {
  const meta = statusMeta(record, status);
  const sub: string[] = [];
  if (record.flag || record.country) sub.push(`${record.flag ? record.flag + " " : ""}${record.country}`.trim());
  if (record.catName) sub.push(record.catName.split(",")[0]);
  if (record.quality) sub.push(record.quality);

  return (
    <div
      className={`${styles.row} ${active ? styles.active : ""}`}
      onClick={() => onSelect(record)}
      role="option"
      aria-selected={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(record);
      }}
    >
      <Avatar name={record.name} logo={logo} size={44} />
      <div className={styles.main}>
        <div className={styles.name}>{record.name}</div>
        <div className={styles.sub}>
          {sub.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.sep}>·</span>}
              {s}
            </span>
          ))}
        </div>
      </div>
      {meta.label && <span className={`${styles.badge} ${styles["b_" + meta.cls]}`}>{meta.label}</span>}
      <span className={styles.dot} style={{ background: meta.dot }} />
      <button
        className={`${styles.fav} ${fav ? styles.favOn : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(record.url);
        }}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
        aria-pressed={fav}
      >
        <Icon name="star" size={18} fill={fav ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export const ChannelRow = memo(ChannelRowBase);

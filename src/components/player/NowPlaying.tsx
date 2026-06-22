import { Avatar } from "../common/Avatar";
import { Icon } from "../common/Icon";
import type { StreamRecord } from "../../types/iptv";
import styles from "./NowPlaying.module.css";

interface Props {
  record: StreamRecord;
  logo?: string;
  langName?: string;
  fav: boolean;
  onToggleFav: (url: string) => void;
  onCopy: (url: string) => void;
}

export function NowPlaying({ record, logo, langName, fav, onToggleFav, onCopy }: Props) {
  const meta: string[] = [];
  if (record.flag || record.country) meta.push(`${record.flag ? record.flag + " " : ""}${record.country}`.trim());
  if (record.catName) meta.push(record.catName);
  if (langName) meta.push(langName);
  if (record.quality) meta.push(record.quality);

  return (
    <div className={styles.np}>
      <Avatar name={record.name} logo={logo} size={52} />
      <div className={styles.info}>
        <h2 className={styles.title}>{record.name}</h2>
        <div className={styles.meta}>
          {meta.map((m, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.sep}>·</span>}
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={`${styles.action} ${fav ? styles.favOn : ""}`}
          onClick={() => onToggleFav(record.url)}
          aria-pressed={fav}
          aria-label={fav ? "Remove favorite" : "Add favorite"}
        >
          <Icon name="star" size={18} fill={fav ? "currentColor" : "none"} />
        </button>
        <button className={styles.action} onClick={() => onCopy(record.url)} aria-label="Copy stream URL">
          <Icon name="copy" size={18} />
        </button>
        <a
          className={styles.action}
          href={record.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open .m3u8"
        >
          <Icon name="external" size={18} />
        </a>
      </div>
    </div>
  );
}

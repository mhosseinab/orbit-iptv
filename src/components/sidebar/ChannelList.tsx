import { forwardRef, useImperativeHandle, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChannelRow } from "./ChannelRow";
import type { Status, StatusEntry, StreamRecord } from "../../types/iptv";
import styles from "./ChannelList.module.css";

export interface ChannelListHandle {
  scrollToIndex: (index: number) => void;
}

interface Props {
  records: StreamRecord[];
  currentUrl: string | null;
  favorites: Set<string>;
  statusByUrl: Map<string, StatusEntry>;
  logosByCh: Map<string, string>;
  onSelect: (r: StreamRecord) => void;
  onToggleFav: (url: string) => void;
}

const ROW_H = 66;

export const ChannelList = forwardRef<ChannelListHandle, Props>(function ChannelList(
  { records, currentUrl, favorites, statusByUrl, logosByCh, onSelect, onToggleFav },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => virt.scrollToIndex(index, { align: "center" }),
  }));

  if (records.length === 0) {
    return (
      <div ref={scrollRef} className={styles.scroller}>
        <div className={styles.empty}>
          <p>No channels match your filters.</p>
          <span>Try clearing the search or a filter.</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={styles.scroller} role="listbox" aria-label="Channels">
      <div className={styles.spacer} style={{ height: virt.getTotalSize() }}>
        {virt.getVirtualItems().map((vi) => {
          const r = records[vi.index];
          const status: Status | null = statusByUrl.get(r.url)?.status ?? null;
          return (
            <div
              key={r.url}
              className={styles.rowWrap}
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <ChannelRow
                record={r}
                active={r.url === currentUrl}
                fav={favorites.has(r.url)}
                logo={r.ch ? logosByCh.get(r.ch) : undefined}
                status={status}
                onSelect={onSelect}
                onToggleFav={onToggleFav}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

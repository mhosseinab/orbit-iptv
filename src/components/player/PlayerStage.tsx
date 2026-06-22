import { type RefObject } from "react";
import { Controls } from "./Controls";
import { NowPlaying } from "./NowPlaying";
import { StatusBanner } from "./StatusBanner";
import { Icon } from "../common/Icon";
import type { BannerState, LevelOption, PlayPhase } from "../../hooks/useHlsPlayer";
import type { StreamRecord } from "../../types/iptv";
import styles from "./PlayerStage.module.css";

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  shellRef: RefObject<HTMLDivElement>;
  current: StreamRecord | null;
  phase: PlayPhase;
  loadingText: string;
  banner: BannerState | null;
  levels: LevelOption[];
  level: number;
  onSetLevel: (lvl: number) => void;
  logo?: string;
  langName?: string;
  fav: boolean;
  onToggleFav: (url: string) => void;
  onCopy: (url: string) => void;
  onToast: (msg: string) => void;
  onAbout: () => void;
}

export function PlayerStage({
  videoRef,
  shellRef,
  current,
  phase,
  loadingText,
  banner,
  levels,
  level,
  onSetLevel,
  logo,
  langName,
  fav,
  onToggleFav,
  onCopy,
  onToast,
  onAbout,
}: Props) {
  return (
    <section className={styles.stage}>
      <div ref={shellRef} className={styles.shell}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          controls={false}
          style={{ display: current ? "block" : "none" }}
        />

        {!current && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Icon name="tv" size={40} fill="var(--fg-mute)" />
            </div>
            <h2>Pick a channel to start watching</h2>
            <p>
              12,500+ free live TV channels from 100+ countries. Search or filter on the left, then
              click a channel. <button className={styles.link} onClick={onAbout}>How it works</button>
            </p>
          </div>
        )}

        {current && phase === "loading" && (
          <div className={styles.loading}>
            <span className={styles.spinner} />
            <span>{loadingText}</span>
          </div>
        )}
      </div>

      {current && (
        <Controls
          videoRef={videoRef}
          shellRef={shellRef}
          levels={levels}
          level={level}
          onSetLevel={onSetLevel}
          onToast={onToast}
        />
      )}

      <StatusBanner banner={banner} />

      {current && (
        <NowPlaying
          record={current}
          logo={logo}
          langName={langName}
          fav={fav}
          onToggleFav={onToggleFav}
          onCopy={onCopy}
        />
      )}
    </section>
  );
}

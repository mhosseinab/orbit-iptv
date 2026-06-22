import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "../common/Icon";
import type { LevelOption } from "../../hooks/useHlsPlayer";
import styles from "./Controls.module.css";

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  shellRef: RefObject<HTMLElement>;
  levels: LevelOption[];
  level: number;
  onSetLevel: (lvl: number) => void;
  onToast: (msg: string) => void;
}

export function Controls({ videoRef, shellRef, levels, level, onSetLevel, onToast }: Props) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ up: false, maxH: 260 });
  const qualityRef = useRef<HTMLDivElement>(null);
  const qualityBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => {
      setMuted(v.muted || v.volume === 0);
      setVolume(v.volume);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    onVol();
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, [videoRef]);

  // On open, drop in whichever direction has more room and cap the height to fit
  // — the player can be pinned to the top (mobile) or bottom (fullscreen).
  useLayoutEffect(() => {
    if (!qualityOpen) return;
    const r = qualityBtnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = above > below;
    setMenuPos({ up, maxH: Math.max(120, Math.min(260, up ? above : below)) });
  }, [qualityOpen]);

  useEffect(() => {
    if (!qualityOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!qualityRef.current?.contains(e.target as Node)) setQualityOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQualityOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [qualityOpen]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const onVolInput = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      onToast("Picture-in-picture not available");
    }
  };

  const toggleFullscreen = () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.requestFullscreen?.();
  };

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
        <Icon name={playing ? "pause" : "play"} size={20} />
      </button>

      <button className={styles.btn} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
        <Icon name={muted ? "mute" : "volume"} size={20} />
      </button>
      <input
        className={styles.volume}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(e) => onVolInput(parseFloat(e.target.value))}
        aria-label="Volume"
      />

      <span className={`${styles.live} ${playing ? styles.liveOn : ""}`}>
        <span className={styles.liveDot} /> LIVE
      </span>

      <div className={styles.spacer} />

      {levels.length > 0 && (
        <div className={styles.quality} ref={qualityRef}>
          <button
            ref={qualityBtnRef}
            type="button"
            className={styles.qualityBtn}
            onClick={() => setQualityOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={qualityOpen}
            aria-label="Quality"
          >
            {levels.find((l) => l.value === level)?.label ?? levels[0].label}
            <Icon name="chevron" size={14} />
          </button>
          {qualityOpen && (
            <ul
              className={`${styles.qualityMenu} ${menuPos.up ? styles.menuUp : styles.menuDown}`}
              style={{ maxHeight: menuPos.maxH }}
              role="listbox"
            >
              {levels.map((l) => (
                <li key={l.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={l.value === level}
                    className={`${styles.qualityItem} ${l.value === level ? styles.qualityActive : ""}`}
                    onClick={() => {
                      onSetLevel(l.value);
                      setQualityOpen(false);
                    }}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button className={styles.btn} onClick={togglePip} aria-label="Picture in picture">
        <Icon name="pip" size={20} />
      </button>
      <button className={styles.btn} onClick={toggleFullscreen} aria-label="Fullscreen">
        <Icon name="fullscreen" size={20} />
      </button>
    </div>
  );
}

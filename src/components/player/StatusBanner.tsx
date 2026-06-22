import type { BannerState } from "../../hooks/useHlsPlayer";
import styles from "./StatusBanner.module.css";

const ICONS: Record<string, string> = {
  geo: "🌐",
  restrict: "🔒",
  cors: "⛔",
  fail: "⚠️",
  offline: "📴",
  info: "ℹ️",
};

export function StatusBanner({ banner }: { banner: BannerState | null }) {
  if (!banner) return null;
  return (
    <div className={`${styles.banner} ${styles[banner.cls] ?? ""}`} role="status">
      <span className={styles.icon} aria-hidden="true">
        {ICONS[banner.cls] ?? "ℹ️"}
      </span>
      <span className={styles.text}>
        <strong>{banner.head}</strong> {banner.body}
        {banner.deployHint && " Deploy on Cloudflare Pages (proxy bundled) to fix it."}
        {banner.url && (
          <>
            {" "}
            <a href={banner.url} target="_blank" rel="noopener noreferrer">
              Open the .m3u8
            </a>
            .
          </>
        )}
      </span>
    </div>
  );
}

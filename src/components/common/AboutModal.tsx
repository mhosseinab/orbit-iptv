import { Modal } from "./Modal";

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="About Orbit IPTV" onClose={onClose}>
      <p>
        Orbit IPTV is a free web player for 12,500+ live TV channels from over 100 countries,
        aggregated by the open-source{" "}
        <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer">
          iptv-org
        </a>{" "}
        project. No signup, nothing to install — it runs entirely in your browser.
      </p>

      <h3>Why won't some channels play?</h3>
      <p>
        Streams are flagged in advance: <strong>Geo</strong> means the broadcaster restricts it by
        region, and <strong>Restricted</strong> means it needs custom request headers that browsers
        won't send for media. Others fail on CORS or are simply offline. On deployments with the
        bundled proxy, blocked streams are retried automatically.
      </p>

      <h3>Tips</h3>
      <p>
        Safari plays the widest range of streams thanks to native HLS. Use the filters and search to
        narrow things down, star channels to keep favorites on top, and try keyboard shortcuts:
        <code>/</code> search, <code>space</code> play/pause, <code>f</code> fullscreen,{" "}
        <code>m</code> mute, <code>↑/↓</code> to move through the list.
      </p>

      <h3>Legal</h3>
      <p>
        Orbit IPTV hosts no video. It links only to publicly available streams aggregated by the
        community. Availability and licensing are the responsibility of each original broadcaster.
      </p>
    </Modal>
  );
}

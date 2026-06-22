import { type RefObject } from "react";
import { Icon } from "../common/Icon";
import styles from "./Topbar.module.css";

interface Props {
  subtitle: string;
  search: string;
  onSearch: (v: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  proxyOk: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onAbout: () => void;
  isMobile: boolean;
  onOpenFilters: () => void;
}

export function Topbar({
  subtitle,
  search,
  onSearch,
  searchRef,
  proxyOk,
  onRefresh,
  refreshing,
  onAbout,
  isMobile,
  onOpenFilters,
}: Props) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <div className={styles.logo} aria-hidden="true">
          <Icon name="tv" size={20} fill="var(--accent-ink)" />
        </div>
        <div className={styles.brandText}>
          <h1 className={styles.name}>
            Orbit<span className={styles.nameAccent}>IPTV</span>
          </h1>
          <span className={styles.sub}>{subtitle}</span>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <Icon name="search" size={18} />
        <input
          ref={searchRef}
          className={styles.search}
          type="search"
          placeholder="Search channels, countries, categories…  ( / )"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search channels"
        />
      </div>

      <div className={styles.actions}>
        {proxyOk && (
          <span className={styles.proxyPill} title="Stream proxy is active">
            <span className={styles.dot} /> Proxy
          </span>
        )}
        {isMobile && (
          <button className={styles.iconBtn} onClick={onOpenFilters} aria-label="Filters">
            <Icon name="filter" size={18} />
          </button>
        )}
        <button
          className={styles.iconBtn}
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh playlist"
          title="Refresh playlist"
        >
          <span className={refreshing ? styles.spin : ""}>
            <Icon name="refresh" size={18} />
          </span>
        </button>
        <button className={styles.iconBtn} onClick={onAbout} aria-label="About" title="About">
          <Icon name="info" size={18} />
        </button>
      </div>
    </header>
  );
}

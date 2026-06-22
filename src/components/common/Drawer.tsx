import { type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Drawer.module.css";

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close filters">
            <Icon name="close" size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

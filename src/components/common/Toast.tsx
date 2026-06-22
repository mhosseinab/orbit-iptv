import styles from "./Toast.module.css";

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={`${styles.toast} ${message ? styles.show : ""}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

import { useState } from "react";
import { avatarColor, initials } from "../../lib/avatar";
import styles from "./Avatar.module.css";

// Channel logo with a deterministic colored-initials fallback (on missing logo
// or image load error).
export function Avatar({
  name,
  logo,
  size = 44,
}: {
  name: string;
  logo?: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = logo && !broken;
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        background: showImg ? "#0c0f17" : avatarColor(name),
      }}
    >
      {showImg ? (
        <img src={logo} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className={styles.ini}>{initials(name)}</span>
      )}
    </div>
  );
}

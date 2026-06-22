type IconName =
  | "search"
  | "refresh"
  | "info"
  | "play"
  | "pause"
  | "volume"
  | "mute"
  | "pip"
  | "fullscreen"
  | "star"
  | "copy"
  | "share"
  | "external"
  | "close"
  | "filter"
  | "chevron"
  | "tv";

const PATHS: Record<IconName, JSX.Element> = {
  search: <path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />,
  refresh: (
    <path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" />
  ),
  info: <path d="M11 7h2v2h-2V7Zm0 4h2v6h-2v-6Zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />,
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  volume: (
    <>
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  mute: (
    <>
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  pip: <path d="M3 5h18v14H3V5Zm2 2v10h14V7H5Zm6 4h6v4h-6v-4Z" />,
  fullscreen: <path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" />,
  star: (
    <path
      d="m12 17.3-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  copy: <path d="M9 3h10v14h-2V5H9V3Zm-4 4h10v14H5V7Zm2 2v10h6V9H7Z" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.4 10.7l7.2-4.4M8.4 13.3l7.2 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  external: <path d="M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4ZM5 5h5v2H7v10h10v-3h2v5H5V5Z" />,
  close: <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z" />,
  filter: <path d="M3 5h18v2l-7 7v5l-4 2v-7L3 7V5Z" />,
  chevron: <path d="M6 9l6 6 6-6-1.4-1.4L12 12.2 7.4 7.6 6 9Z" />,
  tv: <path d="M3 6h18v12H3V6Zm2 2v8h14V8H5Zm4-5 3 3 3-3h2l-4 4h-2L7 3h2Z" />,
};

export function Icon({
  name,
  size = 20,
  fill = "currentColor",
}: {
  name: IconName;
  size?: number;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

import s from "./board.module.css";

/** The matrix as a mark: four cells, quick wins filled. */
export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      className={s.logo}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Leverage"
    >
      <rect x="2" y="2" width="28" height="28" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M16 2v28M2 16h28" stroke="currentColor" strokeWidth="3" />
      <rect className={s.logoWin} x="5" y="5" width="8.5" height="8.5" rx="2.5" fill="var(--win)" />
    </svg>
  );
}

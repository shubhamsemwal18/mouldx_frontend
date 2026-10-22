export default function FilterIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#374151"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />

      <circle cx="15" cy="6" r="2.5" fill="white" />
      <circle cx="8" cy="12" r="2.5" fill="white" />
      <circle cx="13" cy="18" r="2.5" fill="white" />
    </svg>
  );
}

export default function TikiFace({ className = 'w-20 h-24' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 96"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Headdress spikes */}
      <polygon points="18,20 24,6 30,20" fill="#8B6914" />
      <polygon points="34,16 40,2 46,16" fill="#D4830A" />
      <polygon points="50,20 56,6 62,20" fill="#8B6914" />

      {/* Head */}
      <rect x="10" y="18" width="60" height="72" rx="7" fill="#5C2E0A" />

      {/* Forehead band */}
      <rect x="10" y="18" width="60" height="13" rx="5" fill="#3B1A05" />
      <rect x="18" y="22" width="9" height="6" rx="1.5" fill="#8B6914" />
      <rect x="35" y="22" width="10" height="6" rx="1.5" fill="#D4830A" />
      <rect x="53" y="22" width="9" height="6" rx="1.5" fill="#8B6914" />

      {/* Eyebrows */}
      <rect x="16" y="33" width="20" height="4" rx="2" fill="#2A0F00" />
      <rect x="44" y="33" width="20" height="4" rx="2" fill="#2A0F00" />

      {/* Eye sockets */}
      <ellipse cx="27" cy="46" rx="10" ry="11" fill="#1C0A00" />
      <ellipse cx="53" cy="46" rx="10" ry="11" fill="#1C0A00" />

      {/* Eye glow */}
      <ellipse cx="27" cy="46" rx="6" ry="7" fill="#F5A623" opacity="0.85" />
      <ellipse cx="53" cy="46" rx="6" ry="7" fill="#F5A623" opacity="0.85" />

      {/* Pupils */}
      <ellipse cx="27" cy="46" rx="3" ry="3.5" fill="#1C0A00" />
      <ellipse cx="53" cy="46" rx="3" ry="3.5" fill="#1C0A00" />

      {/* Nose */}
      <rect x="33" y="57" width="14" height="8" rx="3" fill="#3B1A05" />

      {/* Mouth */}
      <rect x="18" y="70" width="44" height="14" rx="4" fill="#1C0A00" />
      {/* Teeth */}
      <rect x="20" y="70" width="10" height="9" rx="1.5" fill="#F0E6CC" />
      <rect x="34" y="70" width="12" height="9" rx="1.5" fill="#F0E6CC" />
      <rect x="50" y="70" width="10" height="9" rx="1.5" fill="#F0E6CC" />

      {/* Cheek ridges */}
      <ellipse cx="13" cy="54" rx="4" ry="7" fill="#3B1A05" />
      <ellipse cx="67" cy="54" rx="4" ry="7" fill="#3B1A05" />
    </svg>
  )
}

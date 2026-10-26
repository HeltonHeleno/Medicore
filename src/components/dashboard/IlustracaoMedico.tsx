/**
 * Ilustração original (SVG) do card de boas-vindas: médico de jaleco com
 * estetoscópio e prancheta, cercado de ícones de saúde. Puramente decorativa.
 */
export function IlustracaoMedico({ className }: { className?: string }) {
  const icone = '#8CC9BE';
  return (
    <svg
      viewBox="0 0 320 260"
      className={className}
      aria-hidden
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Ícones flutuantes */}
      <g stroke={icone} strokeWidth="4">
        {/* batimento cardíaco */}
        <path d="M22 56 h18 l8 -16 l10 30 l8 -14 h18" />
        {/* cápsula */}
        <g transform="rotate(-40 52 150)">
          <rect x="30" y="140" width="46" height="20" rx="10" />
          <path d="M53 140 v20" />
        </g>
        {/* seringa */}
        <g transform="rotate(-45 282 52)">
          <rect x="262" y="45" width="34" height="14" rx="3" />
          <path d="M296 52 h14 M310 45 v14 M262 52 h-12 M270 45 v-5 M278 45 v-5 M286 45 v-5" />
        </g>
        {/* estetoscópio */}
        <path d="M236 92 v18 a14 14 0 0 0 28 0 v-18" />
        <path d="M250 124 v10 a12 12 0 0 0 24 0 v-6" />
        <circle cx="274" cy="122" r="7" />
      </g>

      {/* Corpo: jaleco */}
      <path
        d="M96 260 V198 c0 -26 18 -44 44 -48 h40 c26 4 44 22 44 48 V260 Z"
        fill="#FFFFFF"
        stroke="#D3E0DD"
        strokeWidth="2"
      />
      {/* camisa e gravata */}
      <path d="M140 150 h40 l-20 48 Z" fill="#8EC5E8" />
      <path d="M154 158 h12 l-2 8 l5 40 l-9 10 l-9 -10 l5 -40 Z" fill="#2F4B63" />
      {/* lapelas */}
      <path d="M140 150 l-12 22 l18 6 l14 -28" fill="#F3F7F6" stroke="#D3E0DD" strokeWidth="2" />
      <path d="M180 150 l12 22 l-18 6 l-14 -28" fill="#F3F7F6" stroke="#D3E0DD" strokeWidth="2" />
      {/* bolso e caneta */}
      <rect
        x="186"
        y="200"
        width="22"
        height="16"
        rx="2"
        fill="#F3F7F6"
        stroke="#D3E0DD"
        strokeWidth="2"
      />
      <path d="M192 192 v12" stroke="#C8102E" strokeWidth="3" />

      {/* Pescoço e cabeça */}
      <rect x="148" y="126" width="24" height="28" rx="8" fill="#EDB98C" />
      <ellipse cx="124" cy="96" rx="7" ry="10" fill="#F2C6A0" />
      <ellipse cx="196" cy="96" rx="7" ry="10" fill="#F2C6A0" />
      <ellipse cx="160" cy="92" rx="36" ry="42" fill="#F6CDA8" />
      {/* cabelo */}
      <path
        d="M124 88 c-4 -34 18 -52 40 -50 c22 -2 38 14 36 46 c-6 -14 -14 -22 -26 -24 c-12 8 -32 10 -50 28 Z"
        fill="#3A2A22"
      />
      {/* sobrancelhas, olhos e sorriso */}
      <path d="M138 82 q8 -6 16 0 M166 82 q8 -6 16 0" stroke="#3A2A22" strokeWidth="3" />
      <circle cx="146" cy="94" r="4.5" fill="#1F2A2A" />
      <circle cx="174" cy="94" r="4.5" fill="#1F2A2A" />
      <circle cx="147.5" cy="92.5" r="1.4" fill="#FFFFFF" />
      <circle cx="175.5" cy="92.5" r="1.4" fill="#FFFFFF" />
      <path d="M146 112 q14 14 28 0 Z" fill="#FFFFFF" stroke="#7A3E2E" strokeWidth="2.5" />
      <path d="M160 98 q-3 6 0 8" stroke="#D99E78" strokeWidth="2.5" />

      {/* Estetoscópio no pescoço */}
      <path
        d="M136 154 c-6 18 -6 34 4 48 M184 154 c6 18 6 34 -4 48"
        stroke="#2E3A3A"
        strokeWidth="4"
      />
      <path d="M140 202 c4 10 16 12 20 22" stroke="#2E3A3A" strokeWidth="4" />
      <circle cx="162" cy="230" r="8" fill="#B8C6C4" stroke="#2E3A3A" strokeWidth="3" />

      {/* Braço esquerdo com "joinha" */}
      <path d="M100 190 c-14 6 -20 16 -22 26" stroke="#FFFFFF" strokeWidth="18" />
      <path d="M100 190 c-14 6 -20 16 -22 26" stroke="#D3E0DD" strokeWidth="2" />
      <rect x="64" y="200" width="22" height="20" rx="7" fill="#F6CDA8" />
      <rect x="68" y="186" width="9" height="20" rx="4.5" fill="#F6CDA8" />

      {/* Braço direito e prancheta */}
      <g transform="rotate(12 248 196)">
        <rect x="222" y="158" width="52" height="70" rx="5" fill="#16695E" />
        <rect x="229" y="168" width="38" height="54" rx="2" fill="#FFFFFF" />
        <rect x="238" y="152" width="20" height="10" rx="3" fill="#B8C6C4" />
        <path
          d="M235 180 h26 M235 189 h26 M235 198 h26 M235 207 h18"
          stroke="#9AA8A6"
          strokeWidth="2.5"
        />
        <path d="M233 176 l3 3 l5 -6" stroke="#16695E" strokeWidth="2.5" />
      </g>
      <path d="M220 192 c8 2 14 8 18 14" stroke="#FFFFFF" strokeWidth="16" />
      <ellipse cx="238" cy="208" rx="9" ry="8" fill="#F6CDA8" />
    </svg>
  );
}

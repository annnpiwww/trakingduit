import * as React from "react";

/**
 * Rumbai / Bunting Flag Merah-Putih melengkung gantung untuk bagian atas Modal / Banner.
 */
export function BuntingFlagsSVG({ className = "w-full h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      {/* Tali gantung */}
      <path
        d="M0 5 Q 100 25, 200 15 T 400 5"
        stroke="#e2e8f0"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.8"
      />

      {/* Bendera Segitiga 1 - Merah */}
      <polygon points="15,7 45,7 30,32" fill="#DC2626" />
      <polygon points="15,7 45,7 30,20" fill="#EF4444" />
      
      {/* Bendera Segitiga 2 - Putih */}
      <polygon points="55,10 85,10 70,35" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      <polygon points="55,10 85,10 70,22" fill="#F8FAFC" />

      {/* Bendera Segitiga 3 - Merah */}
      <polygon points="95,13 125,13 110,38" fill="#DC2626" />
      <polygon points="95,13 125,13 110,25" fill="#EF4444" />

      {/* Bendera Segitiga 4 - Putih */}
      <polygon points="135,14 165,14 150,39" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      <polygon points="135,14 165,14 150,26" fill="#F8FAFC" />

      {/* Bendera Segitiga 5 - Merah */}
      <polygon points="175,15 205,15 190,40" fill="#DC2626" />
      <polygon points="175,15 205,15 190,27" fill="#EF4444" />

      {/* Bendera Segitiga 6 - Putih */}
      <polygon points="215,14 245,14 230,39" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      <polygon points="215,14 245,14 230,26" fill="#F8FAFC" />

      {/* Bendera Segitiga 7 - Merah */}
      <polygon points="255,13 285,13 270,38" fill="#DC2626" />
      <polygon points="255,13 285,13 270,25" fill="#EF4444" />

      {/* Bendera Segitiga 8 - Putih */}
      <polygon points="295,10 325,10 310,35" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      <polygon points="295,10 325,10 310,22" fill="#F8FAFC" />

      {/* Bendera Segitiga 9 - Merah */}
      <polygon points="335,7 365,7 350,32" fill="#DC2626" />
      <polygon points="335,7 365,7 350,20" fill="#EF4444" />
    </svg>
  );
}

/**
 * Bendera Indonesia Berkibar (Waving Flag SVG) dengan tiang & kilau lipatan kain.
 */
export function WavingFlagSVG({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient Emas untuk Ujung Tiang */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>

        {/* Gradient Tiang Bendera */}
        <linearGradient id="poleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Gradient Merah Bendera */}
        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>

        {/* Shadow/Highlight Gelombang Kain */}
        <linearGradient id="waveShadow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Ujung Bola Emas Tiang */}
      <circle cx="10" cy="8" r="3.5" fill="url(#goldGrad)" />

      {/* Tiang Bendera */}
      <rect x="8.5" y="8" width="3" height="52" rx="1.5" fill="url(#poleGrad)" />

      {/* Group Bendera Berkibar */}
      <g>
        {/* Bagian Merah (Atas) */}
        <path
          d="M 11 12 C 22 8, 32 17, 44 13 C 52 10, 57 14, 59 13 L 59 27 C 52 28, 44 24, 32 28 C 22 31, 15 25, 11 26 Z"
          fill="url(#redGrad)"
        />

        {/* Bagian Putih (Bawah) */}
        <path
          d="M 11 26 C 15 25, 22 31, 32 28 C 44 24, 52 28, 59 27 L 59 41 C 52 42, 44 38, 32 42 C 22 45, 15 39, 11 40 Z"
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="0.5"
        />

        {/* Overlay Gelombang Kain untuk Efek 3D Waves */}
        <path
          d="M 11 12 C 22 8, 32 17, 44 13 C 52 10, 57 14, 59 13 L 59 41 C 52 42, 44 38, 32 42 C 22 45, 15 39, 11 40 Z"
          fill="url(#waveShadow)"
        />
      </g>
    </svg>
  );
}

/**
 * Pita Merah Putih / Ribbon SVG Ornamen untuk TopBar & Banner.
 */
export function RedWhiteRibbonSVG({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="ribbonRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="ribbonWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      {/* Ekor Pita Kiri */}
      <path d="M 5 28 L 18 16 L 5 4 L 22 6 L 26 16 L 22 26 Z" fill="#991B1B" />
      
      {/* Ekor Pita Kanan */}
      <path d="M 95 28 L 82 16 L 95 4 L 78 6 L 74 16 L 78 26 Z" fill="#991B1B" />

      {/* Badan Pita Utama (Melengkung Cantik) - Merah Atas */}
      <path
        d="M 15 6 Q 50 2, 85 6 L 85 16 Q 50 12, 15 16 Z"
        fill="url(#ribbonRed)"
      />

      {/* Badan Pita Utama - Putih Bawah */}
      <path
        d="M 15 16 Q 50 12, 85 16 L 85 26 Q 50 22, 15 26 Z"
        fill="url(#ribbonWhite)"
      />

      {/* Lencana Tengah Simpul Merah Putih */}
      <circle cx="50" cy="16" r="8" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M 42 16 A 8 8 0 0 0 58 16 Z" fill="#FFFFFF" />
      <circle cx="50" cy="16" r="3" fill="#EAB308" />
    </svg>
  );
}

/**
 * Badge "DISKON KEMERDEKAAN" berkilau border emas.
 */
export function MerdekaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white uppercase shadow-md shadow-red-600/30 ring-2 ring-amber-400/30 ${className}`}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-300 opacity-75"></span>
        <span className="relative inline-flex size-2 rounded-full bg-amber-200"></span>
      </span>
      <span>🇮🇩 DISKON KEMERDEKAAN</span>
    </span>
  );
}

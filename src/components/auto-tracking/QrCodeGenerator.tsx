"use client";

import React, { useState } from "react";
import { QrCode, Copy, Check } from "lucide-react";

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
}

export default function QrCodeGenerator({ value, size = 200 }: QrCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const encodedValue = encodeURIComponent(value);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=svg&data=${encodedValue}`;

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="qr-code-container"
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
    >
      <img
        src={qrApiUrl}
        alt="Companion App Pairing QR Code"
        width={size}
        height={size}
        className="rounded-lg"
      />
      <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
          <span>Scan via Companion App</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-500" />
              <span>Salin Payload</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

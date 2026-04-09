'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  return (
    <div className="inline-flex justify-center p-4 bg-white/5 rounded-lg">
      <QRCodeSVG
        value={url}
        size={size}
        bgColor="#1a1a1f"
        fgColor="#6366f1"
        level="M"
        marginSize={2}
        aria-label={`QR code for ${url}`}
      />
    </div>
  );
}

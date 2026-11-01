import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!value) return;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  if (!src) return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} style={{ width: size, height: size }} />;
  return <img src={src} alt="QR" width={size} height={size} className={className} />;
}

import React, { useState, useEffect } from "react";
import { resolveMediaUrl } from "../lib/indexedDBStore";

interface ResolvedImageProps {
  src: string;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  style?: React.CSSProperties;
}

export default function ResolvedImage({ src, fallbackSrc = "", alt, className, onClick, style }: ResolvedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const res = await resolveMediaUrl(src, fallbackSrc || src);
      if (active) {
        setResolvedSrc(res);
      }
    };
    resolve();
    return () => {
      active = false;
    };
  }, [src, fallbackSrc]);

  // Ensure referrerPolicy is set safely for modern sandbox compatibility
  return (
    <img 
      src={resolvedSrc} 
      alt={alt} 
      className={className} 
      onClick={onClick} 
      style={style} 
      referrerPolicy="no-referrer" 
    />
  );
}

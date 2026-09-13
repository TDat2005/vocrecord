import { useEffect, useState, type ImgHTMLAttributes } from 'react';

export const FALLBACK_IMAGE = '/images/products/vinyl-01.webp';

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function SafeImage({ src, alt = '', onError, loading = 'lazy', ...props }: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      loading={loading}
      onError={(event) => {
        onError?.(event);
        if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
      }}
    />
  );
}

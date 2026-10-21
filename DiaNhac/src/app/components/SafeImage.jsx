import { useEffect, useState } from 'react';

export const FALLBACK_IMAGE = '/images/products/vinyl-01.webp';

// Ảnh có ảnh dự phòng khi đường dẫn trong CSDL bị hỏng.
export function SafeImage({ src, alt = '', onError, loading = 'lazy', ...props }) {
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

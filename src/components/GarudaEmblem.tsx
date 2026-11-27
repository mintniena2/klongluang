import React, { useEffect, useState } from 'react';

interface GarudaEmblemProps {
  sizeCm?: number;
  imageUrl?: string;
  className?: string;
}

export const GARUDA_SVG_PATHS = `
  <g fill="#111111" stroke="none">
    <!-- Crown / Chada -->
    <path d="M100 10 L104 26 L108 28 L104 34 L108 42 L92 42 L96 34 L92 28 L96 26 Z" />
    <path d="M90 43 C94 38 106 38 110 43 L112 49 L88 49 Z" />
    <!-- Head & Beak -->
    <path d="M91 49 C88 53 89 60 94 63 C97 65 103 65 106 63 C111 60 112 53 109 49 Z" />
    <path d="M97 56 L106 58 L100 62 Z" fill="#ffffff" />
    <!-- Ear ornaments -->
    <path d="M88 46 C83 45 81 51 85 55 L89 53 Z" />
    <path d="M112 46 C117 45 119 51 115 55 L111 53 Z" />
    <!-- Torso & Chest -->
    <path d="M86 64 C84 74 86 88 92 98 L108 98 C114 88 116 74 114 64 C107 68 93 68 86 64 Z" />
    <path d="M92 67 L108 67 L105 82 L95 82 Z" fill="#ffffff" opacity="0.22" />
    <!-- Left Wing (outer & feathers) -->
    <path d="M85 65 C68 50 42 48 16 60 C25 65 34 67 45 68 C31 70 21 75 15 80 C28 82 40 81 52 79 C39 83 28 89 22 95 C35 95 49 91 61 86 C51 92 42 98 37 104 C50 102 64 96 76 87 C80 82 84 75 85 65 Z" />
    <path d="M84 68 C70 57 49 55 27 63 C39 67 53 69 68 70 C54 73 41 76 30 80 C45 81 60 79 75 76 Z" fill="#ffffff" opacity="0.18" />
    <!-- Right Wing (outer & feathers) -->
    <path d="M115 65 C132 50 158 48 184 60 C175 65 166 67 155 68 C169 70 179 75 185 80 C172 82 160 81 148 79 C161 83 172 89 178 95 C165 95 151 91 139 86 C149 92 158 98 163 104 C150 102 136 96 124 87 C120 82 116 75 115 65 Z" />
    <path d="M116 68 C130 57 151 55 173 63 C161 67 147 69 132 70 C146 73 159 76 170 80 C155 81 140 79 125 76 Z" fill="#ffffff" opacity="0.18" />
    <!-- Left Arm & Hand raised -->
    <path d="M84 72 C74 78 65 90 61 102 C58 109 62 115 69 112 C75 109 80 100 84 92 Z" />
    <!-- Right Arm & Hand raised -->
    <path d="M116 72 C126 78 135 90 139 102 C142 109 138 115 131 112 C125 109 120 100 116 92 Z" />
    <!-- Waist & Sash -->
    <path d="M90 98 L110 98 L113 108 L87 108 Z" />
    <path d="M87 108 C76 116 70 128 66 144 C73 141 80 132 87 120 Z" />
    <path d="M113 108 C124 116 130 128 134 144 C127 141 120 132 113 120 Z" />
    <!-- Legs & Talons -->
    <path d="M89 108 C83 124 76 138 72 150 C78 148 82 142 86 134 C88 142 87 150 85 156 C91 151 95 142 96 132 L98 110 Z" />
    <path d="M111 108 C117 124 124 138 128 150 C122 148 118 142 114 134 C112 142 113 150 115 156 C109 151 105 142 104 132 L102 110 Z" />
    <!-- Tail Feathers -->
    <path d="M95 112 L105 112 L112 162 L105 154 L100 174 L95 154 L88 162 Z" />
    <path d="M91 142 L82 168 L92 158 Z" />
    <path d="M109 142 L118 168 L108 158 Z" />
  </g>
`;

export const GarudaEmblem: React.FC<GarudaEmblemProps> = ({
  sizeCm = 3,
  imageUrl,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const trimmedUrl = imageUrl?.trim();
  if (trimmedUrl && !imgError) {
    return (
      <img
        src={trimmedUrl}
        alt="ตราครุฑ"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        style={{ height: `${sizeCm}cm`, width: 'auto', objectFit: 'contain' }}
        className={`select-none ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 185"
      style={{ height: `${sizeCm}cm`, width: 'auto' }}
      className={`select-none ${className}`}
      aria-label="ตราครุฑ"
      dangerouslySetInnerHTML={{ __html: GARUDA_SVG_PATHS }}
    />
  );
};

async function imageUrlToPngDataUrl(
  imageUrl: string,
  pixelSize = 240
): Promise<string> {
  if (typeof document === 'undefined') return '';
  if (imageUrl.startsWith('data:image/')) return imageUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio = img.naturalHeight / Math.max(1, img.naturalWidth);
        canvas.width = pixelSize;
        canvas.height = Math.round(pixelSize * ratio);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Fallback to raw external URL if canvas tainted by CORS
      }
      resolve(imageUrl);
    };
    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
}

export async function garudaSvgToPngDataUrl(
  pixelSize = 240,
  customImageUrl?: string
): Promise<string> {
  if (typeof document === 'undefined') return '';

  const trimmed = customImageUrl?.trim();
  if (trimmed) {
    const converted = await imageUrlToPngDataUrl(trimmed, pixelSize);
    if (converted) return converted;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 185" width="${pixelSize}" height="${Math.round(
    (pixelSize * 185) / 200
  )}">${GARUDA_SVG_PATHS}</svg>`;

  return new Promise((resolve) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelSize;
      canvas.height = Math.round((pixelSize * 185) / 200);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(pngUrl);
      } else {
        URL.revokeObjectURL(url);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

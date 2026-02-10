import { useEffect, useRef } from 'react';
import { AD_CLIENT, AD_SLOTS } from '../../config/ads';
import './AdBanner.css';

interface AdBannerProps {
  slot: keyof typeof AD_SLOTS;
  format?: 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export function AdBanner({ slot, format = 'horizontal', className }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  const adSlotId = AD_SLOTS[slot];

  useEffect(() => {
    if (!AD_CLIENT || !adSlotId) return;
    if (isLoaded.current) return;

    try {
      const adsbygoogle = (window as unknown as Record<string, unknown[]>).adsbygoogle || [];
      adsbygoogle.push({});
      isLoaded.current = true;
    } catch {
      // AdSense not loaded
    }
  }, [adSlotId]);

  if (AD_CLIENT && adSlotId) {
    return (
      <div className={`ad-banner ad-banner--${format} ${className || ''}`} ref={adRef}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={adSlotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div className={`ad-banner ad-banner--placeholder ad-banner--${format} ${className || ''}`}>
      <span className="ad-banner-placeholder-text">AD</span>
    </div>
  );
}

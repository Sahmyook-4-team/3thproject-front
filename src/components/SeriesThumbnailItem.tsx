// @ts-nocheck
// 파일 경로: src/components/SeriesThumbnailItem.tsx

import React from 'react';
import styles from './SeriesThumbnailItem.module.css';

// 이제 이 컴포넌트는 thumbnailUrl을 직접 props로 받습니다.
export default function SeriesThumbnailItem({ series, isActive, onClick, thumbnailUrl }) {
    console.log(series);
    console.log(thumbnailUrl);
  return (
    <button
      className={`${styles.thumbnailItem} ${isActive ? styles.activeThumbnail : ''}`}
      onClick={onClick}
    >
      <div className={styles.thumbnailImage}>
        {/* thumbnailUrl이 있으면 img 태그를, 없으면 Modality를 보여줍니다. */}
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={series.seriesdesc || 'Series thumbnail'} />
        ) : (
          <span>{series.modality}</span>
        )}
      </div>
      <div className={styles.thumbnailDesc}>
        {series.seriesnum}. {series.seriesdesc || 'No Description'} ({series.imagecnt}장)
      </div>
    </button>
  );
}
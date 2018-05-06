import React from 'react';

export default ({ width = 14, height = 14, color }) => (
  <svg width={width} height={height} viewBox="0 0 16 16">
    <path
      d="M13.901 2.599A8 8 0 0 0 0 8h1.5a6.5 6.5 0 0 1 11.339-4.339L10.5 6H16V.5l-2.099 2.099zM14.5 8a6.5 6.5 0 0 1-11.339 4.339L5.5 10H0v5.5l2.099-2.099A8 8 0 0 0 16 8h-1.5z"
      fill={color}
    />
  </svg>
);

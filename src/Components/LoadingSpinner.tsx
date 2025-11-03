import React from 'react';

type Props = {
  size?: number;
  className?: string;
};

export default function LoadingSpinner({ size = 16, className = '' }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderWidth: Math.max(2, Math.floor(size / 8)),
  };
  return (
    <span
      className={`inline-block align-middle rounded-full border-gray-300 border-t-transparent animate-spin ${className}`}
      style={style}
      aria-label="Loading"
      role="status"
    />
  );
}

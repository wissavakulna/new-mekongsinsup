import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export default function Logo({ className = "", size = 40, color = "white" }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background - Rounded Square */}
      <rect width="400" height="400" rx="40" fill="#1B5E20" />
      
      {/* Text MS Logo */}
      <text 
        x="200" 
        y="275" 
        fill={color} 
        fontSize="210" 
        textAnchor="middle" 
        fontWeight="800"
        style={{ fontFamily: 'sans-serif' }}
      >
        MS
      </text>
    </svg>
  );
}

import React from 'react';

export const ResizeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
    <path d="M3 9V5a2 2 0 0 1 2-2h4" />
    <line x1="9" y1="9" x2="21" y2="21" />
    <line x1="15" y1="9" x2="21" y2="15" />
    <line x1="9" y1="15" x2="15" y2="21" />
  </svg>
);

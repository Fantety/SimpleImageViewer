import React from 'react';

export const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 4h16v4h-2V6H14v12h2v2H8v-2h2V6H6v2H4V4z"
        fill="currentColor"
      />
    </svg>
  );
};
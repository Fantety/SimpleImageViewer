import React from 'react';
import { icons } from './icons';

export type IconName = 
  | 'resize'
  | 'crop'
  | 'convert'
  | 'background'
  | 'save'
  | 'open'
  | 'prev'
  | 'next'
  | 'theme-light'
  | 'theme-dark';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = 'currentColor',
  className = '' 
}) => {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent 
      width={size} 
      height={size} 
      fill={color}
      className={className}
    />
  );
};

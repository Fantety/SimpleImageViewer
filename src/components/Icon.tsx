import React from 'react';
import { icons, type IconName } from './icons/index';

export type { IconName };

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

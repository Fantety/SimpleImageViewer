import React from 'react';
import { ResizeIcon } from './ResizeIcon';
import { CropIcon } from './CropIcon';
import { ConvertIcon } from './ConvertIcon';
import { BackgroundIcon } from './BackgroundIcon';
import { SaveIcon } from './SaveIcon';
import { OpenIcon } from './OpenIcon';
import { PrevIcon } from './PrevIcon';
import { NextIcon } from './NextIcon';
import { ThemeLightIcon } from './ThemeLightIcon';
import { ThemeDarkIcon } from './ThemeDarkIcon';
import { ZoomInIcon } from './ZoomInIcon';
import { ZoomOutIcon } from './ZoomOutIcon';
import { ResetZoomIcon } from './ResetZoomIcon';
import { RotateLeftIcon } from './RotateLeftIcon';
import { RotateRightIcon } from './RotateRightIcon';
import { FavoriteIcon } from './FavoriteIcon';
import { TagIcon } from './TagIcon';
import { SearchIcon } from './SearchIcon';
import { OcrIcon } from './OcrIcon';

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
  | 'theme-dark'
  | 'plus'
  | 'minus'
  | 'reset'
  | 'rotate-left'
  | 'rotate-right'
  | 'favorite'
  | 'tag'
  | 'search'
  | 'ocr';

export const icons: Record<IconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'resize': ResizeIcon,
  'crop': CropIcon,
  'convert': ConvertIcon,
  'background': BackgroundIcon,
  'save': SaveIcon,
  'open': OpenIcon,
  'prev': PrevIcon,
  'next': NextIcon,
  'theme-light': ThemeLightIcon,
  'theme-dark': ThemeDarkIcon,
  'plus': ZoomInIcon,
  'minus': ZoomOutIcon,
  'reset': ResetZoomIcon,
  'rotate-left': RotateLeftIcon,
  'rotate-right': RotateRightIcon,
  'favorite': FavoriteIcon,
  'tag': TagIcon,
  'search': SearchIcon,
  'ocr': OcrIcon,
};

// Export individual icons for direct use if needed
export {
  ResizeIcon,
  CropIcon,
  ConvertIcon,
  BackgroundIcon,
  SaveIcon,
  OpenIcon,
  PrevIcon,
  NextIcon,
  ThemeLightIcon,
  ThemeDarkIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ResetZoomIcon,
  RotateLeftIcon,
  RotateRightIcon,
  FavoriteIcon,
  TagIcon,
  SearchIcon,
  OcrIcon,
};

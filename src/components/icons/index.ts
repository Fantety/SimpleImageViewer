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
import type { IconName } from '../Icon';

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
};

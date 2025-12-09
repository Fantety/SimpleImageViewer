import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ImageData } from '../types/tauri';
import { deepCopyImageData } from '../utils/imageData';

/**
 * Application state interface
 */
export interface ApplicationState {
  currentImage: ImageData | null;
  imageHistory: ImageData[];
  currentHistoryIndex: number;
  directoryImages: string[];
  currentImageIndex: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial application state
 */
const initialState: ApplicationState = {
  currentImage: null,
  imageHistory: [],
  currentHistoryIndex: -1,
  directoryImages: [],
  currentImageIndex: -1,
  isLoading: false,
  error: null,
};

/**
 * Context value interface with state and actions
 */
interface AppStateContextValue {
  state: ApplicationState;
  setCurrentImage: (image: ImageData | null) => void;
  updateCurrentImagePath: (newPath: string) => void;
  addToHistory: (image: ImageData) => void;
  navigateHistory: (direction: 'undo' | 'redo') => void;
  setDirectoryImages: (images: string[]) => void;
  navigateImage: (direction: 'prev' | 'next') => void;
  setCurrentImageIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

/**
 * AppStateProvider component
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ApplicationState>(initialState);

  /**
   * Set the current image
   * Creates a deep copy to ensure immutability
   */
  const setCurrentImage = useCallback((image: ImageData | null) => {
    setState(prev => ({
      ...prev,
      currentImage: image ? deepCopyImageData(image) : null,
    }));
  }, []);

  /**
   * Update the current image path
   * Used when saving to a new location
   */
  const updateCurrentImagePath = useCallback((newPath: string) => {
    setState(prev => {
      if (!prev.currentImage) {
        return prev;
      }
      
      const updatedImage = {
        ...prev.currentImage,
        path: newPath,
      };
      
      return {
        ...prev,
        currentImage: updatedImage,
      };
    });
  }, []);

  /**
   * Add an image to the edit history
   * This creates a new history entry and removes any forward history
   * Creates deep copies to ensure immutability of history
   */
  const addToHistory = useCallback((image: ImageData) => {
    setState(prev => {
      // Create a deep copy to ensure immutability
      const imageCopy = deepCopyImageData(image);
      
      // Remove any forward history when adding a new edit
      const newHistory = prev.imageHistory.slice(0, prev.currentHistoryIndex + 1);
      newHistory.push(imageCopy);
      
      return {
        ...prev,
        currentImage: imageCopy,
        imageHistory: newHistory,
        currentHistoryIndex: newHistory.length - 1,
      };
    });
  }, []);

  /**
   * Navigate through edit history (undo/redo)
   */
  const navigateHistory = useCallback((direction: 'undo' | 'redo') => {
    setState(prev => {
      const { imageHistory, currentHistoryIndex } = prev;
      
      if (direction === 'undo' && currentHistoryIndex > 0) {
        const newIndex = currentHistoryIndex - 1;
        return {
          ...prev,
          currentImage: imageHistory[newIndex],
          currentHistoryIndex: newIndex,
        };
      }
      
      if (direction === 'redo' && currentHistoryIndex < imageHistory.length - 1) {
        const newIndex = currentHistoryIndex + 1;
        return {
          ...prev,
          currentImage: imageHistory[newIndex],
          currentHistoryIndex: newIndex,
        };
      }
      
      return prev;
    });
  }, []);

  /**
   * Set the list of images in the current directory
   */
  const setDirectoryImages = useCallback((images: string[]) => {
    setState(prev => ({
      ...prev,
      directoryImages: images,
    }));
  }, []);

  /**
   * Navigate to the previous or next image in the directory
   */
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    setState(prev => {
      const { directoryImages, currentImageIndex } = prev;
      
      if (directoryImages.length === 0) {
        return prev;
      }
      
      let newIndex: number;
      
      if (direction === 'next') {
        // Move to next image, wrap around to 0 if at the end
        newIndex = (currentImageIndex + 1) % directoryImages.length;
      } else {
        // Move to previous image, wrap around to end if at the beginning
        newIndex = currentImageIndex <= 0 
          ? directoryImages.length - 1 
          : currentImageIndex - 1;
      }
      
      return {
        ...prev,
        currentImageIndex: newIndex,
      };
    });
  }, []);

  /**
   * Set the current image index directly
   */
  const setCurrentImageIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentImageIndex: index,
    }));
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  /**
   * Set error message
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
    }));
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Reset state to initial values
   */
  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const value: AppStateContextValue = {
    state,
    setCurrentImage,
    updateCurrentImagePath,
    addToHistory,
    navigateHistory,
    setDirectoryImages,
    navigateImage,
    setCurrentImageIndex,
    setLoading,
    setError,
    clearError,
    resetState,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook to access application state and actions
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

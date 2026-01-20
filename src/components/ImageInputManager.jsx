import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';

// Image validation constants
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_FILE_SIZE = 3.75 * 1024 * 1024; // 3.75MB (accounts for ~33% base64 increase to stay under 5MB API limit)
export const MAX_IMAGES = 5;

// Compression settings
export const COMPRESSION_THRESHOLD = 1 * 1024 * 1024; // 1MB - compress files larger than this
export const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  maxIteration: 10,
  initialQuality: 0.8
};

/**
 * Validates a file for image upload (type only - size is checked after compression)
 * @param {File} file - The file to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateImageFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Only validate type here - size is checked after compression attempt
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    const typeName = file.type || 'unknown';
    errors.push(`Invalid file type: ${typeName}. Allowed types: JPEG, PNG, GIF, WebP`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Compress image if needed, returning the smaller of original/compressed
 * Skips GIFs (to preserve animation) and files already under threshold
 * @param {File} file - Original image file
 * @returns {Promise<File>} - Compressed file or original if smaller/skipped
 */
export async function compressImageIfNeeded(file) {
  // Skip if already under threshold
  if (file.size <= COMPRESSION_THRESHOLD) {
    return file;
  }

  // Skip GIFs (compression breaks animation)
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

    // Log compression results for debugging
    console.log(`Compression: ${(file.size/1024/1024).toFixed(2)}MB -> ${(compressedFile.size/1024/1024).toFixed(2)}MB`);

    // Use smaller of the two (compression can sometimes increase size)
    return compressedFile.size < file.size ? compressedFile : file;
  } catch (error) {
    console.warn('Compression failed, using original:', error);
    return file; // Graceful fallback
  }
}

class ImageInputManager {
  constructor() {
    this.selectedImages = []; // Changed from selectedImage
    this.isPickerPresented = false;
    this.isDragActive = false;  // NEW: for drag-drop visual feedback
    this.error = null;          // NEW: for validation error display
    this.listeners = new Set();
  }

  addImage(image) {
    if (this.selectedImages.length >= MAX_IMAGES) {
      this.setError(`Maximum ${MAX_IMAGES} images allowed`);
      return false;
    }
    this.selectedImages = [...this.selectedImages, image];
    this.error = null; // Clear error on successful add
    this.notifyListeners();
    return true;
  }

  removeImage(index) {
    if (index >= 0 && index < this.selectedImages.length) {
      this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
      this.notifyListeners();
    }
  }

  clearAllImages() {
    this.selectedImages = [];
    this.error = null;
    this.notifyListeners();
  }

  // Keep for backward compatibility but mark deprecated
  setSelectedImage(image) {
    console.warn('setSelectedImage is deprecated, use addImage instead');
    this.selectedImages = image ? [image] : [];
    this.notifyListeners();
  }

  clearSelectedImage() {
    console.warn('clearSelectedImage is deprecated, use clearAllImages instead');
    this.clearAllImages();
  }

  setIsDragActive(active) {
    this.isDragActive = active;
    this.notifyListeners();
  }

  setError(errorMessage) {
    this.error = errorMessage;
    this.notifyListeners();
  }

  clearError() {
    this.error = null;
    this.notifyListeners();
  }

  setIsPickerPresented(isPresented) {
    this.isPickerPresented = isPresented;
    this.notifyListeners();
  }

  // Observable pattern for React components
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        selectedImages: this.selectedImages,
        selectedImage: this.selectedImages[0] || null, // Backward compatibility
        isPickerPresented: this.isPickerPresented,
        isDragActive: this.isDragActive,
        error: this.error
      });
    });
  }
}

// React hook to use ImageInputManager
export const useImageInputManager = () => {
  const [state, setState] = useState({
    selectedImages: [],
    selectedImage: null, // Backward compatibility
    isPickerPresented: false,
    isDragActive: false,
    error: null
  });

  const managerRef = useRef(null);

  React.useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ImageInputManager();
    }

    const unsubscribe = managerRef.current.subscribe(setState);

    // Initialize state from manager
    setState({
      selectedImages: managerRef.current.selectedImages,
      selectedImage: managerRef.current.selectedImages[0] || null,
      isPickerPresented: managerRef.current.isPickerPresented,
      isDragActive: managerRef.current.isDragActive,
      error: managerRef.current.error
    });

    return unsubscribe;
  }, []);

  // Add multiple images with validation and automatic compression
  const addImages = React.useCallback(async (files) => {
    const manager = managerRef.current;
    if (!manager) return { added: [], rejected: [] };

    const added = [];
    const rejected = [];
    const filesToProcess = Array.from(files);

    for (const file of filesToProcess) {
      // Validate type only (size checked after compression)
      const validation = validateImageFile(file);
      if (!validation.valid) {
        rejected.push({ file, errors: validation.errors });
        continue;
      }

      // Check limit
      if (manager.selectedImages.length + added.length >= MAX_IMAGES) {
        rejected.push({ file, errors: [`Maximum ${MAX_IMAGES} images allowed`] });
        continue;
      }

      try {
        // Compress if needed (transparent to user)
        const processedFile = await compressImageIfNeeded(file);

        // Now check size AFTER compression
        if (processedFile.size > MAX_FILE_SIZE) {
          const sizeMB = (processedFile.size / (1024 * 1024)).toFixed(1);
          rejected.push({
            file,
            errors: [`Image still too large after compression: ${sizeMB}MB. Maximum: 3.75MB`]
          });
          continue;
        }

        // Read and create image object
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const imageObj = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                data: e.target.result,
                file: processedFile, // Use processed (possibly compressed) file
                name: file.name, // Keep original name
                size: processedFile.size, // Use processed size
                type: processedFile.type,
                width: img.width,
                height: img.height,
                originalSize: file.size, // Track original for debugging/UI
                wasCompressed: processedFile !== file
              };
              manager.addImage(imageObj);
              resolve();
            };
            img.onerror = () => {
              reject(new Error(`Failed to load image: ${file.name}`));
            };
            img.src = e.target.result;
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read file: ${file.name}`));
          };
          reader.readAsDataURL(processedFile);
        });

        added.push(file);
      } catch (error) {
        rejected.push({ file, errors: [error.message] });
      }
    }

    // Set error for first rejection if any
    if (rejected.length > 0 && added.length === 0) {
      manager.setError(rejected[0].errors[0]);
    }

    return { added, rejected };
  }, []);

  const removeImage = React.useCallback((index) => {
    managerRef.current?.removeImage(index);
  }, []);

  const clearAllImages = React.useCallback(() => {
    managerRef.current?.clearAllImages();
  }, []);

  const setIsDragActive = React.useCallback((active) => {
    managerRef.current?.setIsDragActive(active);
  }, []);

  const setError = React.useCallback((error) => {
    managerRef.current?.setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    managerRef.current?.clearError();
  }, []);

  // Backward compatibility
  const setSelectedImage = React.useCallback((image) => {
    managerRef.current?.setSelectedImage(image);
  }, []);

  const setIsPickerPresented = React.useCallback((isPresented) => {
    managerRef.current?.setIsPickerPresented(isPresented);
  }, []);

  const clearSelectedImage = React.useCallback(() => {
    managerRef.current?.clearSelectedImage();
  }, []);

  return {
    // New multi-image API
    selectedImages: state.selectedImages,
    isDragActive: state.isDragActive,
    error: state.error,
    addImages,
    removeImage,
    clearAllImages,
    setIsDragActive,
    setError,
    clearError,
    // Backward compatibility
    selectedImage: state.selectedImage,
    isPickerPresented: state.isPickerPresented,
    setSelectedImage,
    setIsPickerPresented,
    clearSelectedImage
  };
};

// ImagePicker component equivalent
export const ImagePicker = ({ manager, onImageSelected, children }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        const img = new Image();
        img.onload = () => {
          // Create image object with necessary properties
          const imageObj = {
            data: imageData,
            width: img.width,
            height: img.height,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type
          };
          
          if (manager) {
            manager.setSelectedImage(imageObj);
          }
          
          if (onImageSelected) {
            onImageSelected(imageObj);
          }
        };
        img.src = imageData;
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <div onClick={triggerFilePicker} style={{ cursor: 'pointer' }}>
        {children || (
          <div className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
        )}
      </div>
    </>
  );
};

// React component version that matches SwiftUI ImagePicker
export const ImagePickerView = ({ manager }) => {
  const handleImageSelected = (imageObj) => {
    console.log('Image selected:', imageObj.name, imageObj.size);
  };

  return (
    <ImagePicker manager={manager} onImageSelected={handleImageSelected}>
      <div className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="text-gray-600"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      </div>
    </ImagePicker>
  );
};

export default ImageInputManager;
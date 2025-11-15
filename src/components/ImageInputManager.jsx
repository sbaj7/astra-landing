import React, { useState, useRef } from 'react';

class ImageInputManager {
  constructor() {
    this.selectedImage = null;
    this.isPickerPresented = false;
    this.listeners = new Set();
  }

  setSelectedImage(image) {
    this.selectedImage = image;
    this.notifyListeners();
  }

  setIsPickerPresented(isPresented) {
    this.isPickerPresented = isPresented;
    this.notifyListeners();
  }

  clearSelectedImage() {
    this.selectedImage = null;
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
        selectedImage: this.selectedImage,
        isPickerPresented: this.isPickerPresented
      });
    });
  }
}

// React hook to use ImageInputManager
export const useImageInputManager = () => {
  const [state, setState] = useState({
    selectedImage: null,
    isPickerPresented: false
  });

  const managerRef = useRef(null);

  React.useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ImageInputManager();
    }

    const unsubscribe = managerRef.current.subscribe(setState);
    
    // Initialize state
    setState({
      selectedImage: managerRef.current.selectedImage,
      isPickerPresented: managerRef.current.isPickerPresented
    });

    return unsubscribe;
  }, []);

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
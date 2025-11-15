// ReferenceManager.js - Placeholder for reference management functionality

class ReferenceManager {
  constructor() {
    this.references = [];
    this.listeners = new Set();
  }

  // Add a reference
  addReference(reference) {
    this.references.push({
      id: Date.now() + Math.random(),
      ...reference,
      dateAdded: new Date()
    });
    this.notifyListeners();
  }

  // Remove a reference
  removeReference(referenceId) {
    this.references = this.references.filter(ref => ref.id !== referenceId);
    this.notifyListeners();
  }

  // Get all references
  getAllReferences() {
    return [...this.references];
  }

  // Get reference by ID
  getReferenceById(id) {
    return this.references.find(ref => ref.id === id);
  }

  // Search references
  searchReferences(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.references.filter(ref => 
      ref.title?.toLowerCase().includes(lowercaseQuery) ||
      ref.authors?.toLowerCase().includes(lowercaseQuery) ||
      ref.content?.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Clear all references
  clearReferences() {
    this.references = [];
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
        references: this.getAllReferences(),
        count: this.references.length
      });
    });
  }

  // Export references to JSON
  exportReferences() {
    return JSON.stringify(this.references, null, 2);
  }

  // Import references from JSON
  importReferences(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.references = imported.map(ref => ({
          ...ref,
          id: ref.id || Date.now() + Math.random(),
          dateAdded: ref.dateAdded ? new Date(ref.dateAdded) : new Date()
        }));
        this.notifyListeners();
        return true;
      }
    } catch (error) {
      console.error('Failed to import references:', error);
    }
    return false;
  }
}

// React hook to use ReferenceManager
export const useReferenceManager = () =>
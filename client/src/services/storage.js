// Firebase Storage service for file uploads
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata
} from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Storage Service for handling file uploads
 */
export class StorageService {
  constructor() {
    this.storage = storage;
  }

  /**
   * Upload a file to Firebase Storage
   * @param {File} file - The file to upload
   * @param {string} userId - User ID for organizing files
   * @param {string} folder - Folder name (e.g., 'cvs', 'documents')
   * @param {function} onProgress - Progress callback function
   * @returns {Promise} Upload result with download URL
   */
  async uploadFile(file, userId, folder = 'cvs', onProgress = null) {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const filename = this.generateFilename(file);
      const filePath = `users/${userId}/${folder}/${filename}`;
      
      // Create storage reference
      const fileRef = ref(this.storage, filePath);

      // Upload with progress monitoring if callback provided
      if (onProgress) {
        return this.uploadWithProgress(fileRef, file, onProgress);
      } else {
        // Simple upload
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
          success: true,
          downloadURL,
          filePath,
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          }
        };
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw this.handleUploadError(error);
    }
  }

  /**
   * Upload file with progress monitoring
   * @param {StorageReference} fileRef - Firebase storage reference
   * @param {File} file - File to upload
   * @param {function} onProgress - Progress callback
   * @returns {Promise} Upload result
   */
  uploadWithProgress(fileRef, file, onProgress) {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed',
        // Progress monitoring
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress: Math.round(progress),
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state
          });
        },
        // Error handling
        (error) => {
          console.error('Upload error:', error);
          reject(this.handleUploadError(error));
        },
        // Success
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              downloadURL,
              filePath: uploadTask.snapshot.ref.fullPath,
              metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
              }
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Delete a file from Firebase Storage
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const fileRef = ref(this.storage, filePath);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      // If file doesn't exist, consider it a success
      if (error.code === 'storage/object-not-found') {
        return true;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise} File metadata
   */
  async getFileMetadata(filePath) {
    try {
      const fileRef = ref(this.storage, filePath);
      const metadata = await getMetadata(fileRef);
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a file
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise<string>} Download URL
   */
  async getDownloadURL(filePath) {
    try {
      const fileRef = ref(this.storage, filePath);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Check file type (PDF, DOC, DOCX)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed');
    }

    return true;
  }

  /**
   * Generate unique filename
   * @param {File} file - Original file
   * @returns {string} Unique filename
   */
  generateFilename(file) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(file.name);
    
    return `${timestamp}_${randomString}${extension}`;
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Original filename
   * @returns {string} File extension with dot
   */
  getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.'));
  }

  /**
   * Handle upload errors and provide user-friendly messages
   * @param {Error} error - Upload error
   * @returns {Error} Formatted error
   */
  handleUploadError(error) {
    switch (error.code) {
      case 'storage/unauthorized':
        return new Error('You do not have permission to upload files');
      case 'storage/canceled':
        return new Error('Upload was canceled');
      case 'storage/quota-exceeded':
        return new Error('Storage quota exceeded');
      case 'storage/invalid-format':
        return new Error('Invalid file format');
      case 'storage/invalid-event-name':
        return new Error('Invalid upload event');
      default:
        return new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get human-readable file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file type is supported
   * @param {string} mimeType - File MIME type
   * @returns {boolean} Whether file type is supported
   */
  isSupportedFileType(mimeType) {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    return supportedTypes.includes(mimeType);
  }
}

// Export service instance
export const storageService = new StorageService();

// Export file type constants
export const FILE_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain'
};

export const FILE_EXTENSIONS = {
  PDF: '.pdf',
  DOC: '.doc',
  DOCX: '.docx',
  TXT: '.txt'
};
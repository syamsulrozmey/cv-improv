import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cvAPI } from '../services/api';

const CVUpload = ({ onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      onUploadError?.('Invalid file type. Only PDF and DOCX files are allowed.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError?.('File too large. Maximum size allowed is 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('cv', file);

      const response = await cvAPI.uploadCV(formData);
      
      setUploadProgress(100);
      onUploadSuccess?.(response.data.data.cv);
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed. Please try again.';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
          ${isDragActive && !isDragReject ? 'border-primary-500 bg-primary-50' : ''}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50' : ''}
          ${uploading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {/* Upload Icon */}
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div>
            {uploading ? (
              <div className="space-y-2">
                <p className="text-primary-600 font-medium">Uploading and processing CV...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                {isDragActive && !isDragReject ? (
                  <p className="text-primary-600 font-medium">Drop your CV here</p>
                ) : isDragReject ? (
                  <p className="text-red-600 font-medium">Invalid file type</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700">
                      Drop your CV here, or <span className="text-primary-600">browse</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF and DOCX files up to 10MB
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Format Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported formats:</strong> PDF (.pdf), Microsoft Word (.docx)</p>
        <p><strong>Maximum file size:</strong> 10MB</p>
        <p><strong>Note:</strong> Text will be automatically extracted from your document for analysis.</p>
      </div>
    </div>
  );
};

export default CVUpload;
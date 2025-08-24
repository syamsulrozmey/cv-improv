import React, { useState } from 'react';
import { cvAPI } from '../services/api';

const PDFDownload = ({ cvId, cvTitle, onError }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');

  const templates = [
    { id: 'professional', name: 'Professional', description: 'Clean and traditional format' },
    { id: 'modern', name: 'Modern', description: 'Contemporary design with color accents' },
    { id: 'executive', name: 'Executive', description: 'Formal template for senior positions' },
    { id: 'creative', name: 'Creative', description: 'Modern typography and layout' }
  ];

  const handleDownload = async () => {
    if (!cvId) {
      onError?.('CV ID is required for download');
      return;
    }

    setIsDownloading(true);

    try {
      const response = await cvAPI.downloadCV(cvId, selectedTemplate);
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cvTitle || 'CV'}_${selectedTemplate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error.response?.data?.message || 'PDF download failed. Please try again.';
      onError?.(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = () => {
    if (!cvId) {
      onError?.('CV ID is required for preview');
      return;
    }

    const token = localStorage.getItem('accessToken');
    const previewUrl = `${cvAPI.previewCV(cvId, selectedTemplate)}&access_token=${token}`;
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Download PDF</h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose a template and download your optimized CV as a professional PDF.
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${
                selectedTemplate === template.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={() => setSelectedTemplate(template.id)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {template.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {template.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          {isDownloading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Generating PDF...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </div>
          )}
        </button>

        <button
          onClick={handlePreview}
          disabled={isDownloading}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </div>
        </button>
      </div>

      {/* Template Info */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">ATS-Optimized Templates</p>
            <p className="mt-1">All templates are designed to pass through Applicant Tracking Systems while maintaining professional appearance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFDownload;
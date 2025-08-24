import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { jobAPI } from '../services/api';

const JobInput = ({ onJobCreated, onError }) => {
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState('');
  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'url'
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = useForm({
    defaultValues: {
      title: '',
      company: '',
      url: '',
      description: ''
    }
  });

  const watchedDescription = watch('description');

  const handleManualSubmit = async (data) => {
    try {
      const response = await jobAPI.createJob({
        title: data.title || null,
        company: data.company || null,
        description: data.description
      });
      
      onJobCreated?.(response.data.data.job);
      reset();
    } catch (error) {
      console.error('Job creation error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save job description. Please try again.';
      onError?.(errorMessage);
    }
  };

  const handleUrlScrape = async (data) => {
    if (!data.url) {
      onError?.('Please enter a valid job URL.');
      return;
    }

    setIsScrapingUrl(true);
    setScrapingProgress('Accessing job page...');

    try {
      setTimeout(() => setScrapingProgress('Extracting job details...'), 1000);
      setTimeout(() => setScrapingProgress('Analyzing requirements...'), 2000);

      const response = await jobAPI.scrapeJob({ url: data.url });
      
      setScrapingProgress('Complete!');
      onJobCreated?.(response.data.data.job);
      reset();
      
    } catch (error) {
      console.error('Job scraping error:', error);
      let errorMessage = 'Failed to scrape job from URL. Please try copying the description manually.';
      
      if (error.response?.data?.error === 'NETWORK_ERROR') {
        errorMessage = 'Unable to access the job URL. Please check the URL and try again.';
      } else if (error.response?.data?.error === 'ACCESS_BLOCKED') {
        errorMessage = 'Access to this job site is restricted. Please copy the job description manually.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      onError?.(errorMessage);
    } finally {
      setIsScrapingUrl(false);
      setScrapingProgress('');
    }
  };

  const onSubmit = (data) => {
    if (inputMode === 'url') {
      return handleUrlScrape(data);
    } else {
      return handleManualSubmit(data);
    }
  };

  const supportedSites = [
    'LinkedIn Jobs',
    'Indeed',
    'Glassdoor',
    'Monster',
    'ZipRecruiter',
    'Other job sites'
  ];

  return (
    <div className="space-y-6">
      {/* Input Mode Selector */}
      <div className="flex space-x-4 border-b">
        <button
          type="button"
          onClick={() => setInputMode('manual')}
          className={`pb-2 px-1 font-medium text-sm transition-colors duration-200 ${
            inputMode === 'manual'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setInputMode('url')}
          className={`pb-2 px-1 font-medium text-sm transition-colors duration-200 ${
            inputMode === 'url'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          URL Scraping
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {inputMode === 'url' ? (
          /* URL Scraping Mode */
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Job Posting URL
              </label>
              <input
                {...register('url', {
                  required: 'Job URL is required',
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL starting with http:// or https://'
                  }
                })}
                type="url"
                id="url"
                placeholder="https://linkedin.com/jobs/view/123456789"
                className="input-field"
                disabled={isScrapingUrl}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
              )}
            </div>

            {/* Supported Sites Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Job Sites:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                {supportedSites.map((site) => (
                  <div key={site} className="flex items-center space-x-2">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{site}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scraping Progress */}
            {isScrapingUrl && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-primary-700 text-sm font-medium">{scrapingProgress}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Manual Entry Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title (Optional)
                </label>
                <input
                  {...register('title')}
                  type="text"
                  id="title"
                  placeholder="e.g., Senior Software Engineer"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company (Optional)
                </label>
                <input
                  {...register('company')}
                  type="text"
                  id="company"
                  placeholder="e.g., Google"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('description', {
                  required: 'Job description is required',
                  minLength: {
                    value: 10,
                    message: 'Job description must be at least 10 characters long'
                  }
                })}
                id="description"
                rows={12}
                placeholder="Paste the complete job description here..."
                className="input-field resize-y"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
              {watchedDescription && (
                <p className="mt-1 text-xs text-gray-500">
                  Characters: {watchedDescription.length}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isScrapingUrl}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isScrapingUrl ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{inputMode === 'url' ? 'Scraping...' : 'Saving...'}</span>
              </div>
            ) : (
              inputMode === 'url' ? 'Scrape Job' : 'Save Job Description'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobInput;
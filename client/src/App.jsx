import React, { useState } from 'react';
import CVUpload from './components/CVUpload';
import JobInput from './components/JobInput';
import CVAnalysis from './components/CVAnalysis';
import PDFDownload from './components/PDFDownload';
import KanbanBoard from './components/KanbanBoard';
import CreateApplication from './components/CreateApplication';
import './index.css';

function App() {
  const [uploadedCV, setUploadedCV] = useState(null);
  const [savedJob, setSavedJob] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [showCreateApplication, setShowCreateApplication] = useState(false);
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'kanban'
  const [alerts, setAlerts] = useState([]);

  const addAlert = (message, type = 'error') => {
    const alert = {
      id: Date.now(),
      message,
      type
    };
    setAlerts(prev => [...prev, alert]);
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleCVUploadSuccess = (cv) => {
    setUploadedCV(cv);
    addAlert(`CV "${cv.title}" uploaded successfully!`, 'success');
  };

  const handleCVUploadError = (error) => {
    addAlert(error, 'error');
  };

  const handleJobCreated = (job) => {
    setSavedJob(job);
    addAlert(`Job description ${job.title ? `"${job.title}"` : ''} saved successfully!`, 'success');
  };

  const handleJobError = (error) => {
    addAlert(error, 'error');
  };

  const handleAnalysisComplete = (analysis) => {
    setAnalysisResult(analysis);
    addAlert(`Analysis complete! Compatibility score: ${analysis.compatibilityScore}%`, 'success');
  };

  const handleOptimizationComplete = (optimization) => {
    setOptimizationResult(optimization);
    addAlert(`CV optimized! ATS score improved by ${optimization.improvement} points`, 'success');
  };

  const handleApplicationCreated = (application) => {
    setShowCreateApplication(false);
    addAlert(`Application for "${application.job.title}" created successfully!`, 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">CV Improv</h1>
              <span className="text-sm text-gray-500">AI-Powered CV Optimization</span>
            </div>
            
            {/* Navigation */}
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  currentView === 'upload'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                CV Builder
              </button>
              <button
                onClick={() => setCurrentView('kanban')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  currentView === 'kanban'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Applications
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`px-4 py-3 rounded-lg shadow-lg border ${
                alert.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium">{alert.message}</p>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'kanban' ? (
          /* Kanban Board View */
          <KanbanBoard onError={(error) => addAlert(error, 'error')} />
        ) : (
          /* CV Builder View */
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CV Upload Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Your CV</h2>
              <p className="text-gray-600 text-sm">
                Upload your current CV to get started. We'll extract the text for analysis and optimization.
              </p>
            </div>
            
            <div className="card">
              <CVUpload
                onUploadSuccess={handleCVUploadSuccess}
                onUploadError={handleCVUploadError}
              />
            </div>

            {/* Uploaded CV Preview */}
            {uploadedCV && (
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Uploaded CV</h3>
                <div className="space-y-2">
                  <p><strong>Title:</strong> {uploadedCV.title}</p>
                  <p><strong>Status:</strong> <span className="capitalize">{uploadedCV.status}</span></p>
                  <p><strong>Text Length:</strong> {uploadedCV.stats?.textLength} characters</p>
                  <p><strong>Template:</strong> Template #{uploadedCV.templateId}</p>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700">
                      {uploadedCV.originalText?.substring(0, 500)}
                      {uploadedCV.originalText?.length > 500 && '...'}
                    </p>
                  </div>
                  
                  {/* Download Original CV */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Download Options</h4>
                    <PDFDownload
                      cvId={uploadedCV.id}
                      cvTitle={uploadedCV.title}
                      onError={(error) => addAlert(error, 'error')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Job Input Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Description</h2>
              <p className="text-gray-600 text-sm">
                Provide the job description you're applying for. You can either paste it manually or scrape it from a job posting URL.
              </p>
            </div>
            
            <div className="card">
              <JobInput
                onJobCreated={handleJobCreated}
                onError={handleJobError}
              />
            </div>

            {/* Saved Job Preview */}
            {savedJob && (
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Job Description</h3>
                <div className="space-y-2">
                  {savedJob.title && <p><strong>Title:</strong> {savedJob.title}</p>}
                  {savedJob.company && <p><strong>Company:</strong> {savedJob.company}</p>}
                  {savedJob.url && (
                    <p><strong>URL:</strong> 
                      <a href={savedJob.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 ml-2">
                        View Original
                      </a>
                    </p>
                  )}
                  {savedJob.skillsRequired && savedJob.skillsRequired.length > 0 && (
                    <div>
                      <strong>Skills Required:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {savedJob.skillsRequired.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700">
                      {savedJob.description?.substring(0, 500)}
                      {savedJob.description?.length > 500 && '...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis Section */}
        {uploadedCV && savedJob && (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis & Optimization</h2>
              <p className="text-gray-600 text-sm">
                Now that you have both CV and job description, let's analyze compatibility and optimize your CV for better ATS scoring.
              </p>
            </div>
            
            <div className="card">
              <CVAnalysis
                cvId={uploadedCV.id}
                jobId={savedJob.id}
                onAnalysisComplete={handleAnalysisComplete}
                onOptimizationComplete={handleOptimizationComplete}
                onError={(error) => addAlert(error, 'error')}
              />
            </div>
          </div>
        )}

        {/* Optimized CV Display */}
        {optimizationResult && (
          <div className="mt-8 card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Optimized CV</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  ATS Score: <span className="font-semibold text-green-600">{optimizationResult.newAtsScore}</span>
                  {optimizationResult.improvement > 0 && (
                    <span className="text-green-600 ml-1">(+{optimizationResult.improvement})</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                <h4 className="font-medium text-gray-900 mb-2">Optimized CV Text:</h4>
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {optimizationResult.cv?.optimizedText || 'Optimized content not available'}
                </div>
              </div>
              <div className="mt-6">
                <PDFDownload
                  cvId={uploadedCV.id}
                  cvTitle={uploadedCV.title}
                  onError={(error) => addAlert(error, 'error')}
                />
              </div>
            </div>

            {/* Create Application Section */}
            {uploadedCV && savedJob && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Track Application</h2>
                  <p className="text-gray-600 text-sm">
                    Create an application entry to track this job application in your Kanban board.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {!showCreateApplication ? (
                    <div className="card">
                      <div className="text-center py-6">
                        <div className="text-4xl mb-3">📋</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Apply?</h3>
                        <p className="text-gray-600 mb-4">
                          Track this application in your Kanban board to monitor its progress.
                        </p>
                        <button
                          onClick={() => setShowCreateApplication(true)}
                          className="btn-primary"
                        >
                          Add to Application Tracker
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CreateApplication
                      cvId={uploadedCV.id}
                      jobId={savedJob.id}
                      onSuccess={handleApplicationCreated}
                      onError={(error) => addAlert(error, 'error')}
                      onCancel={() => setShowCreateApplication(false)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 CV Improv. AI-powered CV optimization platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
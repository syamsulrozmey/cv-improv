import React, { useState } from 'react';
import { analysisAPI } from '../services/api';

const CVAnalysis = ({ cvId, jobId, onAnalysisComplete, onOptimizationComplete, onError }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);

  const handleAnalyze = async () => {
    if (!cvId || !jobId) {
      onError?.('Both CV and Job Description are required for analysis.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await analysisAPI.analyzeCV({ cvId, jobId });
      const analysisResult = response.data.data.analysis;
      
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);
      
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error.response?.data?.message || 'Analysis failed. Please try again.';
      onError?.(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (!analysis) {
      onError?.('Please analyze the CV first before optimization.');
      return;
    }

    setIsOptimizing(true);
    
    try {
      const response = await analysisAPI.optimizeCV({ cvId, jobId });
      const optimizationResult = response.data.data.optimization;
      
      setOptimization(optimizationResult);
      onOptimizationComplete?.(optimizationResult);
      
    } catch (error) {
      console.error('Optimization error:', error);
      const errorMessage = error.response?.data?.message || 'Optimization failed. Please try again.';
      onError?.(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreText = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !cvId || !jobId}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            'Analyze CV Compatibility'
          )}
        </button>

        {analysis && (
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>Optimizing...</span>
              </div>
            ) : (
              'Optimize CV'
            )}
          </button>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
          
          {/* Compatibility Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Compatibility Score</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.compatibilityScore)}`}>
                {analysis.compatibilityScore}% - {getScoreText(analysis.compatibilityScore)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analysis.compatibilityScore}%` }}
              />
            </div>
          </div>

          {/* Skills Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Matching Skills */}
            <div>
              <h4 className="text-md font-medium text-green-700 mb-3">✅ Skills That Match</h4>
              {analysis.skillsMatching && analysis.skillsMatching.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.skillsMatching.map((skill, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No matching skills identified</p>
              )}
            </div>

            {/* Missing Skills */}
            <div>
              <h4 className="text-md font-medium text-red-700 mb-3">❌ Skills Gaps</h4>
              {analysis.skillsGaps && analysis.skillsGaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.skillsGaps.map((skill, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No skill gaps identified</p>
              )}
            </div>
          </div>

          {/* Experience Assessment */}
          {analysis.experienceAssessment && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Experience Assessment</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Relevant Years:</span>
                    <span className="ml-2">{analysis.experienceAssessment.relevantYears || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Alignment:</span>
                    <span className={`ml-2 capitalize ${
                      analysis.experienceAssessment.alignment === 'high' ? 'text-green-600' :
                      analysis.experienceAssessment.alignment === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analysis.experienceAssessment.alignment || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Certification Suggestions */}
          {analysis.certificationSuggestions && analysis.certificationSuggestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-blue-700 mb-3">🎯 Recommended Certifications</h4>
              <div className="space-y-2">
                {analysis.certificationSuggestions.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-blue-900">{cert.name}</span>
                      {cert.reason && <p className="text-sm text-blue-700 mt-1">{cert.reason}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cert.priority === 'high' ? 'bg-red-100 text-red-700' :
                      cert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {cert.priority} priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords Missing */}
          {analysis.keywordGaps && analysis.keywordGaps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-orange-700 mb-3">🔑 Missing Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.keywordGaps.map((keyword, index) => (
                  <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">💡 Improvement Recommendations</h4>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 capitalize">{rec.category}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-700' :
                        rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{rec.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {analysis.summary && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-md font-medium text-blue-900 mb-2">Summary</h4>
              <p className="text-sm text-blue-800">{analysis.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Optimization Results */}
      {optimization && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Optimization Results</h3>
          
          {/* Score Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-1">ATS Score</h4>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-green-700">{optimization.newAtsScore}</span>
                {optimization.improvement > 0 && (
                  <span className="text-sm text-green-600">
                    (+{optimization.improvement})
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Keywords Added</h4>
              <span className="text-2xl font-bold text-blue-700">
                {optimization.keywordOptimizations?.length || 0}
              </span>
            </div>
          </div>

          {/* Changes Explanation */}
          {optimization.changesExplanation && optimization.changesExplanation.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Changes Made</h4>
              <div className="space-y-3">
                {optimization.changesExplanation.map((change, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                    <div className="font-medium text-yellow-900 mb-1 capitalize">{change.section}</div>
                    <p className="text-sm text-yellow-800 mb-2">{change.changes}</p>
                    <p className="text-xs text-yellow-700 italic">{change.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CVAnalysis;
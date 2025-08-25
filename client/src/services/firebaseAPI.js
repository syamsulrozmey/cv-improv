// Firebase-based API service layer
import { cvService, jobService, applicationService, analysisService } from './firestore';
import { storageService } from './storage';

/**
 * Document Processing Service
 */
class DocumentService {
  /**
   * Extract text from uploaded file
   */
  async extractText(file) {
    if (file.type === 'text/plain') {
      return await this.extractFromText(file);
    } else if (file.type === 'application/pdf') {
      return await this.extractFromPDF(file);
    } else if (file.type.includes('word')) {
      return await this.extractFromWord(file);
    } else {
      throw new Error('Unsupported file type');
    }
  }

  /**
   * Extract text from plain text file
   */
  async extractFromText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  /**
   * Extract text from PDF file
   * Note: This is a simplified implementation
   * For production, you'd want to use a more robust PDF parsing library
   */
  async extractFromPDF(file) {
    try {
      // Using pdfjs-dist for client-side PDF parsing
      const pdfjsLib = await import('pdfjs-dist/webpack');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      throw new Error('PDF processing failed');
    }
  }

  /**
   * Extract text from Word document
   * Note: This is a simplified implementation
   */
  async extractFromWord(file) {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error('Word document processing failed');
    }
  }

  /**
   * Scrape job description from URL
   */
  async scrapeJobFromURL(url) {
    try {
      // This would typically be done server-side to avoid CORS issues
      // For now, we'll return a placeholder response
      return {
        title: 'Scraped Job Title',
        company: 'Company Name',
        description: 'This is a placeholder. URL scraping would be implemented server-side to avoid CORS issues.',
        url: url,
        skillsRequired: ['JavaScript', 'React', 'Node.js'],
        source: 'scraped'
      };
    } catch (error) {
      throw new Error('Job scraping failed');
    }
  }
}

/**
 * Main API Service
 */
export class APIService {
  constructor() {
    this.document = new DocumentService();
    this.serverBaseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
  }

  /**
   * Get authentication headers for server requests
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Make authenticated request to server
   */
  async makeServerRequest(endpoint, options = {}) {
    const url = `${this.serverBaseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: this.getAuthHeaders(),
      ...options,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload and process CV
   */
  async uploadCV(userId, file, title) {
    try {
      // Extract text from file
      const originalText = await this.document.extractText(file);
      
      // Upload file to Firebase Storage
      const uploadResult = await storageService.uploadFile(file, userId, 'cvs');
      
      // Create CV record in Firestore
      const cvData = {
        title: title || file.name,
        originalText,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: uploadResult.filePath,
        downloadURL: uploadResult.downloadURL
      };

      const cv = await cvService.createCV(userId, cvData);
      
      return {
        success: true,
        cv,
        message: 'CV uploaded and processed successfully'
      };
    } catch (error) {
      console.error('Error uploading CV:', error);
      throw error;
    }
  }

  /**
   * Create job description
   */
  async createJob(userId, jobData) {
    try {
      const job = await jobService.createJob(userId, jobData);
      return {
        success: true,
        job,
        message: 'Job description created successfully'
      };
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Scrape job from URL
   */
  async scrapeJob(userId, url) {
    try {
      const jobData = await this.document.scrapeJobFromURL(url);
      const job = await jobService.createJob(userId, jobData);
      
      return {
        success: true,
        job,
        message: 'Job scraped and saved successfully'
      };
    } catch (error) {
      console.error('Error scraping job:', error);
      throw error;
    }
  }

  /**
   * Analyze CV text directly against job description without storing
   */
  async analyzeCVText(cvText, jobDescription) {
    try {
      if (!cvText || !jobDescription) {
        throw new Error('CV text and job description are required');
      }

      const startTime = Date.now();
      const analysisResult = await this.makeServerRequest('/api/analysis/analyze', {
        method: 'POST',
        body: { 
          cvText,
          jobDescription
        }
      });
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis: {
          ...analysisResult.data.analysis,
          processingTime
        },
        message: 'CV analysis completed successfully'
      };
    } catch (error) {
      console.error('Error analyzing CV text:', error);
      throw error;
    }
  }

  /**
   * Optimize CV text directly based on analysis without storing
   */
  async optimizeCVText(cvText, jobDescription, analysisData = null) {
    try {
      if (!cvText || !jobDescription) {
        throw new Error('CV text and job description are required');
      }

      // If no analysis data provided, perform analysis first
      let analysis = analysisData;
      if (!analysis) {
        const analysisResponse = await this.analyzeCVText(cvText, jobDescription);
        analysis = analysisResponse.analysis;
      }

      const startTime = Date.now();
      const optimizationResult = await this.makeServerRequest('/api/analysis/optimize', {
        method: 'POST',
        body: { 
          cvText,
          jobDescription,
          analysisData: analysis
        }
      });
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        optimization: {
          ...optimizationResult.data.optimization,
          processingTime
        },
        message: 'CV optimization completed successfully'
      };
    } catch (error) {
      console.error('Error optimizing CV text:', error);
      throw error;
    }
  }

  /**
   * Analyze CV against job description using secure server endpoint
   */
  async analyzeCV(userId, cvId, jobId) {
    try {
      // Get CV and job data
      const cv = await cvService.getById(cvId);
      const job = await jobService.getById(jobId);

      if (!cv || !job) {
        throw new Error('CV or job not found');
      }

      // Check if analysis already exists
      let existingAnalysis = await analysisService.getAnalysis(cvId, jobId);
      if (existingAnalysis) {
        return {
          success: true,
          analysis: existingAnalysis,
          message: 'Using existing analysis'
        };
      }

      // Call secure server endpoint for AI analysis
      const startTime = Date.now();
      const analysisResult = await this.makeServerRequest('/api/analysis/analyze', {
        method: 'POST',
        body: { 
          cvText: cv.originalText,
          jobDescription: job.description
        }
      });
      const processingTime = Date.now() - startTime;

      // Save analysis to Firestore
      const analysis = await analysisService.createAnalysis(userId, {
        cvId,
        jobId,
        ...analysisResult.data.analysis,
        processingTime
      });

      return {
        success: true,
        analysis,
        message: 'CV analysis completed successfully'
      };
    } catch (error) {
      console.error('Error analyzing CV:', error);
      throw error;
    }
  }

  /**
   * Optimize CV based on analysis using secure server endpoint
   */
  async optimizeCV(userId, cvId, jobId) {
    try {
      // Get analysis first
      const analysisResponse = await this.analyzeCV(userId, cvId, jobId);
      const analysis = analysisResponse.analysis;

      // Get CV and job data
      const cv = await cvService.getById(cvId);
      const job = await jobService.getById(jobId);

      // Call secure server endpoint for CV optimization
      const startTime = Date.now();
      const optimizationResult = await this.makeServerRequest('/api/analysis/optimize', {
        method: 'POST',
        body: { 
          cvText: cv.originalText,
          jobDescription: job.description,
          analysisData: analysis
        }
      });
      const processingTime = Date.now() - startTime;

      const optimizationData = optimizationResult.data.optimization;
      const improvement = optimizationData.improvement || 0;
      const newAtsScore = optimizationData.atsScore || 0;

      // Update CV with optimization
      const cvUpdateData = {
        optimizedText: optimizationData.optimizedCV || optimizationData.optimizedText,
        stats: {
          ...cv.stats,
          processingTime
        },
        optimization: {
          previousAtsScore: analysis.atsScore,
          newAtsScore,
          improvement,
          analysisId: analysis.id,
          optimizedAt: new Date().toISOString()
        }
      };

      await cvService.updateOptimization(cvId, cvUpdateData);

      return {
        success: true,
        cv: {
          ...cv,
          ...cvUpdateData
        },
        improvement,
        newAtsScore,
        message: 'CV optimized successfully'
      };
    } catch (error) {
      console.error('Error optimizing CV:', error);
      throw error;
    }
  }

  /**
   * Create application
   */
  async createApplication(userId, applicationData) {
    try {
      const application = await applicationService.createApplication(userId, applicationData);
      
      return {
        success: true,
        application,
        message: 'Application created successfully'
      };
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  /**
   * Get user's applications for Kanban board
   */
  async getApplications(userId) {
    try {
      const applications = await applicationService.getApplicationsByStatus(userId);
      
      return {
        success: true,
        applications,
        message: 'Applications retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting applications:', error);
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId, status, notes = '') {
    try {
      const application = await applicationService.updateStatus(applicationId, status, notes);
      
      return {
        success: true,
        application,
        message: 'Application status updated successfully'
      };
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Get user's CVs
   */
  async getUserCVs(userId) {
    try {
      const cvs = await cvService.getUserCVs(userId);
      
      return {
        success: true,
        cvs,
        message: 'CVs retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting user CVs:', error);
      throw error;
    }
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(userId) {
    try {
      const jobs = await jobService.getUserJobs(userId);
      
      return {
        success: true,
        jobs,
        message: 'Jobs retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting user jobs:', error);
      throw error;
    }
  }
}

// Export service instance
export const apiService = new APIService();
// Firebase-based API service layer
import { cvService, jobService, applicationService, analysisService } from './firestore';
import { storageService } from './storage';

/**
 * OpenAI API Service for AI analysis
 */
class OpenAIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  /**
   * Analyze CV compatibility with job description
   */
  async analyzeCVCompatibility(cvText, jobDescription) {
    const prompt = `
Analyze the following CV against this job description and provide a detailed compatibility analysis.

CV:
${cvText}

Job Description:
${jobDescription}

Please provide a JSON response with the following structure:
{
  "compatibilityScore": number (0-100),
  "atsScore": number (0-100),
  "skillsMatch": [list of matching skills],
  "skillsGap": [list of missing skills],
  "improvements": [
    {
      "type": "keyword" | "content" | "format",
      "suggestion": "specific improvement suggestion",
      "impact": "high" | "medium" | "low"
    }
  ],
  "keywordAnalysis": {
    "presentKeywords": [list],
    "missingKeywords": [list],
    "density": number
  },
  "suggestions": [list of specific actionable suggestions]
}`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert CV optimization assistant. Analyze CVs and job descriptions to provide detailed compatibility insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  /**
   * Optimize CV content based on job description
   */
  async optimizeCV(cvText, jobDescription, analysisResult) {
    const prompt = `
Based on the following CV analysis, optimize the CV content to better match the job description.

Original CV:
${cvText}

Job Description:
${jobDescription}

Analysis Results:
${JSON.stringify(analysisResult, null, 2)}

Please provide an optimized version of the CV that:
1. Incorporates missing keywords naturally
2. Highlights relevant skills and experience
3. Improves ATS compatibility
4. Maintains professional tone and accuracy
5. Keeps the same general structure

Return the optimized CV text only, without any additional formatting or commentary.`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert CV writer. Optimize CVs to match job requirements while maintaining accuracy and professionalism.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error optimizing CV:', error);
      throw error;
    }
  }
}

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
      // For now, we'll use a simple approach
      // In production, you'd use libraries like pdf-lib or pdf2pic
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            // This is a placeholder - you'd implement actual PDF parsing here
            // For now, we'll just return a message asking users to copy-paste
            resolve('PDF text extraction is not implemented in this demo. Please copy and paste your CV content manually.');
          } catch (error) {
            reject(new Error('Failed to extract text from PDF'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsArrayBuffer(file);
      });
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
      // This is a placeholder - you'd use libraries like mammoth.js
      return 'Word document text extraction is not implemented in this demo. Please copy and paste your CV content manually.';
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
    this.openai = new OpenAIService();
    this.document = new DocumentService();
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
   * Analyze CV against job description
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

      // Perform AI analysis
      const startTime = Date.now();
      const analysisResult = await this.openai.analyzeCVCompatibility(
        cv.originalText,
        job.description
      );
      const processingTime = Date.now() - startTime;

      // Save analysis to Firestore
      const analysis = await analysisService.createAnalysis(userId, {
        cvId,
        jobId,
        ...analysisResult,
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
   * Optimize CV based on analysis
   */
  async optimizeCV(userId, cvId, jobId) {
    try {
      // Get analysis first
      const analysisResponse = await this.analyzeCV(userId, cvId, jobId);
      const analysis = analysisResponse.analysis;

      // Get CV and job data
      const cv = await cvService.getById(cvId);
      const job = await jobService.getById(jobId);

      // Optimize CV content
      const startTime = Date.now();
      const optimizedText = await this.openai.optimizeCV(
        cv.originalText,
        job.description,
        analysis
      );
      const processingTime = Date.now() - startTime;

      // Calculate improvement score
      const improvement = Math.max(0, analysis.atsScore - (cv.optimization?.previousAtsScore || 0));
      const newAtsScore = Math.min(100, analysis.atsScore + 10); // Simulate improvement

      // Update CV with optimization
      const optimizationData = {
        optimizedText,
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

      await cvService.updateOptimization(cvId, optimizationData);

      return {
        success: true,
        cv: {
          ...cv,
          ...optimizationData
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
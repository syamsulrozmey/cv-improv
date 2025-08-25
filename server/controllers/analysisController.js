const pool = require('../config/database');
const aiService = require('../services/aiService');

class AnalysisController {
  static async analyzeCV(req, res) {
    try {
      const { cvText, jobDescription } = req.body;

      // Validate input
      if (!cvText || !jobDescription) {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description are required'
        });
      }

      if (typeof cvText !== 'string' || typeof jobDescription !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description must be strings'
        });
      }

      if (cvText.trim().length === 0 || jobDescription.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description cannot be empty'
        });
      }

      // Perform AI analysis
      console.log('Starting AI analysis for CV and Job...');
      const analysisResult = await aiService.analyzeCompatibility(
        cvText,
        jobDescription
      );

      // Calculate additional metrics
      const compatibilityScore = analysisResult.compatibilityScore || 0;
      const atsScore = aiService.calculateATSScore(
        cvText, 
        analysisResult.keywordGaps || []
      );

      res.json({
        success: true,
        message: 'CV analysis completed successfully',
        data: {
          analysis: {
            compatibilityScore,
            atsScore,
            skillsMatching: analysisResult.skillsMatching || [],
            skillsGaps: analysisResult.skillsGaps || [],
            keywordGaps: analysisResult.keywordGaps || [],
            experienceAssessment: analysisResult.experienceAssessment || {},
            certificationSuggestions: analysisResult.certificationSuggestions || [],
            recommendations: analysisResult.recommendations || [],
            summary: analysisResult.summary || 'Analysis completed',
            analyzedAt: new Date()
          }
        }
      });

    } catch (error) {
      console.error('CV analysis error:', error);
      
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return res.status(503).json({
          success: false,
          message: error.message,
          code: 'AI_SERVICE_ERROR'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during CV analysis'
      });
    }
  }

  static async optimizeCV(req, res) {
    try {
      const { cvText, jobDescription, analysisData } = req.body;

      // Validate input
      if (!cvText || !jobDescription) {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description are required'
        });
      }

      if (typeof cvText !== 'string' || typeof jobDescription !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description must be strings'
        });
      }

      if (cvText.trim().length === 0 || jobDescription.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'CV text and job description cannot be empty'
        });
      }

      // Perform AI optimization
      console.log('Starting AI optimization for CV...');
      const optimizationResult = await aiService.optimizeCV(
        cvText,
        jobDescription,
        analysisData || {}
      );

      res.json({
        success: true,
        message: 'CV optimization completed successfully',
        data: {
          optimization: {
            optimizedCV: optimizationResult.optimizedCV,
            changesExplanation: optimizationResult.changesExplanation || [],
            keywordOptimizations: optimizationResult.keywordOptimizations || [],
            atsScore: optimizationResult.atsScore || 0,
            readabilityScore: optimizationResult.readabilityScore || 0,
            optimizedAt: new Date()
          }
        }
      });

    } catch (error) {
      console.error('CV optimization error:', error);
      
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return res.status(503).json({
          success: false,
          message: error.message,
          code: 'AI_SERVICE_ERROR'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during CV optimization'
      });
    }
  }

  static async getAnalysis(req, res) {
    try {
      const { cvId } = req.params;
      const userId = req.userId;

      const result = await pool.query(
        `SELECT id, title, compatibility_score, analysis_data, status, updated_at
         FROM cvs 
         WHERE id = $1 AND user_id = $2`,
        [cvId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'CV not found or no analysis available'
        });
      }

      const cv = result.rows[0];

      if (!cv.analysis_data) {
        return res.status(404).json({
          success: false,
          message: 'No analysis data found for this CV'
        });
      }

      res.json({
        success: true,
        data: {
          cv: {
            id: cv.id,
            title: cv.title,
            status: cv.status,
            compatibilityScore: cv.compatibility_score,
            lastAnalyzed: cv.updated_at
          },
          analysis: cv.analysis_data
        }
      });

    } catch (error) {
      console.error('Get analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving analysis'
      });
    }
  }

  static async getSkillGapAnalysis(req, res) {
    try {
      const { cvId, jobId } = req.query;
      const userId = req.userId;

      if (!cvId || !jobId) {
        return res.status(400).json({
          success: false,
          message: 'Both cvId and jobId are required'
        });
      }

      // Get CV analysis data
      const cvResult = await pool.query(
        'SELECT analysis_data FROM cvs WHERE id = $1 AND user_id = $2',
        [cvId, userId]
      );

      if (cvResult.rows.length === 0 || !cvResult.rows[0].analysis_data) {
        return res.status(404).json({
          success: false,
          message: 'CV analysis not found. Please analyze the CV first.'
        });
      }

      const analysisData = cvResult.rows[0].analysis_data;
      
      // Get job skills
      const jobResult = await pool.query(
        'SELECT skills_required FROM jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const skillGaps = await aiService.identifySkillGaps(
        analysisData.skillsMatching || [],
        jobResult.rows[0].skills_required || []
      );

      res.json({
        success: true,
        data: {
          skillGaps,
          summary: {
            totalGaps: skillGaps.length,
            highPriorityGaps: skillGaps.filter(gap => gap.priority === 'high').length,
            certificationOpportunities: skillGaps.reduce((sum, gap) => 
              sum + gap.certificationSuggestions.length, 0
            )
          }
        }
      });

    } catch (error) {
      console.error('Skill gap analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during skill gap analysis'
      });
    }
  }
}

module.exports = AnalysisController;
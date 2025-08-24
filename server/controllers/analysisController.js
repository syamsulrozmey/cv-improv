const pool = require('../config/database');
const aiService = require('../services/aiService');

class AnalysisController {
  static async analyzeCV(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { cvId, jobId } = req.body;
      const userId = req.userId;

      // Verify CV belongs to user
      const cvResult = await client.query(
        'SELECT id, title, original_text FROM cvs WHERE id = $1 AND user_id = $2',
        [cvId, userId]
      );

      if (cvResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'CV not found or does not belong to you'
        });
      }

      const cv = cvResult.rows[0];

      if (!cv.original_text) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'CV text is empty. Please upload a CV with content.'
        });
      }

      // Verify job belongs to user
      const jobResult = await client.query(
        'SELECT id, title, company, description FROM jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Job description not found or does not belong to you'
        });
      }

      const job = jobResult.rows[0];

      // Perform AI analysis
      console.log('Starting AI analysis for CV and Job...');
      const analysisResult = await aiService.analyzeCompatibility(
        cv.original_text,
        job.description
      );

      // Calculate additional metrics
      const compatibilityScore = analysisResult.compatibilityScore || 0;
      const atsScore = aiService.calculateATSScore(
        cv.original_text, 
        analysisResult.keywordGaps || []
      );

      // Update CV with analysis results
      const updatedCv = await client.query(
        `UPDATE cvs 
         SET compatibility_score = $1, analysis_data = $2, status = 'analyzed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 
         RETURNING id, title, compatibility_score, analysis_data, status`,
        [
          compatibilityScore, 
          JSON.stringify({
            ...analysisResult,
            atsScore,
            analyzedAt: new Date(),
            jobInfo: {
              id: job.id,
              title: job.title,
              company: job.company
            }
          }),
          cvId
        ]
      );

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_ANALYZED',
          'cv',
          cvId,
          JSON.stringify({ 
            jobId,
            compatibilityScore,
            atsScore,
            skillsGaps: analysisResult.skillsGaps?.length || 0
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'CV analysis completed successfully',
        data: {
          analysis: {
            cvId,
            jobId,
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
          },
          cv: {
            id: updatedCv.rows[0].id,
            title: updatedCv.rows[0].title,
            status: updatedCv.rows[0].status,
            compatibilityScore: updatedCv.rows[0].compatibility_score
          },
          job: {
            id: job.id,
            title: job.title,
            company: job.company
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
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
    } finally {
      client.release();
    }
  }

  static async optimizeCV(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { cvId, jobId } = req.body;
      const userId = req.userId;

      // Get CV with analysis data
      const cvResult = await client.query(
        'SELECT id, title, original_text, analysis_data FROM cvs WHERE id = $1 AND user_id = $2',
        [cvId, userId]
      );

      if (cvResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'CV not found or does not belong to you'
        });
      }

      const cv = cvResult.rows[0];

      if (!cv.analysis_data) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'CV must be analyzed before optimization. Please run analysis first.'
        });
      }

      // Get job description
      const jobResult = await client.query(
        'SELECT id, title, company, description FROM jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Job description not found'
        });
      }

      const job = jobResult.rows[0];

      // Perform AI optimization
      console.log('Starting AI optimization for CV...');
      const optimizationResult = await aiService.optimizeCV(
        cv.original_text,
        job.description,
        cv.analysis_data
      );

      // Update CV with optimized text
      const updatedCv = await client.query(
        `UPDATE cvs 
         SET optimized_text = $1, status = 'optimized', updated_at = CURRENT_TIMESTAMP,
             analysis_data = jsonb_set(analysis_data, '{optimization}', $2)
         WHERE id = $3 
         RETURNING id, title, optimized_text, status, analysis_data`,
        [
          optimizationResult.optimizedCV,
          JSON.stringify({
            ...optimizationResult,
            optimizedAt: new Date()
          }),
          cvId
        ]
      );

      // Calculate new ATS score for optimized CV
      const newAtsScore = aiService.calculateATSScore(
        optimizationResult.optimizedCV,
        cv.analysis_data.keywordGaps || []
      );

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_OPTIMIZED',
          'cv',
          cvId,
          JSON.stringify({ 
            jobId,
            atsScoreImprovement: newAtsScore - (cv.analysis_data.atsScore || 0),
            keywordOptimizations: optimizationResult.keywordOptimizations?.length || 0
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'CV optimization completed successfully',
        data: {
          optimization: {
            cvId,
            jobId,
            originalAtsScore: cv.analysis_data.atsScore || 0,
            newAtsScore,
            improvement: newAtsScore - (cv.analysis_data.atsScore || 0),
            changesExplanation: optimizationResult.changesExplanation || [],
            keywordOptimizations: optimizationResult.keywordOptimizations || [],
            optimizedAt: new Date()
          },
          cv: {
            id: updatedCv.rows[0].id,
            title: updatedCv.rows[0].title,
            status: updatedCv.rows[0].status,
            optimizedText: updatedCv.rows[0].optimized_text
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
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
    } finally {
      client.release();
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
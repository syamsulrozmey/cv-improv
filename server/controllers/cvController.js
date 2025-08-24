const pool = require('../config/database');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const pdfService = require('../services/pdfService');

class CVController {
  static async createCV(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { title, originalText, templateId = 1 } = req.body;
      const userId = req.userId;
      
      // Create CV record
      const cvResult = await client.query(
        `INSERT INTO cvs (user_id, title, original_text, template_id, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, title, original_text, template_id, status, created_at`,
        [userId, title, originalText || null, templateId, 'draft']
      );
      
      const cv = cvResult.rows[0];
      
      // Increment user's CV upload count for plan tracking
      await client.query(
        'UPDATE users SET cv_upload_count = cv_upload_count + 1 WHERE id = $1',
        [userId]
      );
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_CREATED',
          'cv',
          cv.id,
          JSON.stringify({ title, templateId }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'CV created successfully',
        data: {
          cv: {
            id: cv.id,
            title: cv.title,
            originalText: cv.original_text,
            templateId: cv.template_id,
            status: cv.status,
            createdAt: cv.created_at
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating CV'
      });
    } finally {
      client.release();
    }
  }

  static async uploadCV(req, res) {
    const client = await pool.connect();
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;
      const userId = req.userId;
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.mimetype)) {
        // Clean up uploaded file
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only PDF and DOCX files are allowed.'
        });
      }

      await client.query('BEGIN');

      let extractedText = '';
      let title = path.basename(file.originalname, path.extname(file.originalname));

      try {
        if (file.mimetype === 'application/pdf') {
          // Extract text from PDF
          const pdfBuffer = await fs.readFile(file.path);
          const pdfData = await pdfParse(pdfBuffer);
          extractedText = pdfData.text;
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Extract text from DOCX
          const docxResult = await mammoth.extractRawText({ path: file.path });
          extractedText = docxResult.value;
        }

        if (!extractedText.trim()) {
          await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: 'Could not extract text from the uploaded file. Please ensure the file contains readable text.'
          });
        }

      } catch (parseError) {
        console.error('File parsing error:', parseError);
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: 'Failed to parse the uploaded file. The file may be corrupted or in an unsupported format.'
        });
      }

      // Create CV record with extracted text
      const cvResult = await client.query(
        `INSERT INTO cvs (user_id, title, original_text, template_id, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, title, original_text, template_id, status, created_at`,
        [userId, title, extractedText, 1, 'draft']
      );
      
      const cv = cvResult.rows[0];
      
      // Increment user's CV upload count
      await client.query(
        'UPDATE users SET cv_upload_count = cv_upload_count + 1 WHERE id = $1',
        [userId]
      );
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_UPLOADED',
          'cv',
          cv.id,
          JSON.stringify({ 
            fileName: file.originalname, 
            fileSize: file.size, 
            textLength: extractedText.length 
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
      await client.query('COMMIT');
      
      // Clean up uploaded file
      await fs.unlink(file.path);
      
      res.status(201).json({
        success: true,
        message: 'CV uploaded and processed successfully',
        data: {
          cv: {
            id: cv.id,
            title: cv.title,
            originalText: cv.original_text,
            templateId: cv.template_id,
            status: cv.status,
            createdAt: cv.created_at,
            stats: {
              textLength: extractedText.length,
              fileName: file.originalname,
              fileSize: file.size
            }
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Upload CV error:', error);
      
      // Clean up file if it exists
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('File cleanup error:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while processing CV upload'
      });
    } finally {
      client.release();
    }
  }

  static async getCVs(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Get CVs with pagination
      const cvsResult = await pool.query(
        `SELECT c.id, c.title, c.status, c.compatibility_score, c.template_id, c.created_at, c.updated_at,
                LENGTH(c.original_text) as original_text_length,
                LENGTH(c.optimized_text) as optimized_text_length
         FROM cvs c 
         WHERE c.user_id = $1 
         ORDER BY c.updated_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      // Get total count
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM cvs WHERE user_id = $1',
        [userId]
      );

      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          cvs: cvsResult.rows.map(cv => ({
            id: cv.id,
            title: cv.title,
            status: cv.status,
            compatibilityScore: cv.compatibility_score,
            templateId: cv.template_id,
            createdAt: cv.created_at,
            updatedAt: cv.updated_at,
            stats: {
              originalTextLength: cv.original_text_length,
              optimizedTextLength: cv.optimized_text_length
            }
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get CVs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving CVs'
      });
    }
  }

  static async getCV(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const cvResult = await pool.query(
        `SELECT id, title, original_text, optimized_text, compatibility_score, 
                analysis_data, template_id, status, created_at, updated_at
         FROM cvs 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (cvResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'CV not found'
        });
      }

      const cv = cvResult.rows[0];

      res.json({
        success: true,
        data: {
          cv: {
            id: cv.id,
            title: cv.title,
            originalText: cv.original_text,
            optimizedText: cv.optimized_text,
            compatibilityScore: cv.compatibility_score,
            analysisData: cv.analysis_data,
            templateId: cv.template_id,
            status: cv.status,
            createdAt: cv.created_at,
            updatedAt: cv.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Get CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving CV'
      });
    }
  }

  static async updateCV(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { title, originalText, optimizedText, templateId } = req.body;
      const userId = req.userId;

      // Check if CV exists and belongs to user
      const existingCV = await client.query(
        'SELECT id FROM cvs WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (existingCV.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'CV not found'
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        updateValues.push(title);
        paramCount++;
      }

      if (originalText !== undefined) {
        updateFields.push(`original_text = $${paramCount}`);
        updateValues.push(originalText);
        paramCount++;
      }

      if (optimizedText !== undefined) {
        updateFields.push(`optimized_text = $${paramCount}`);
        updateValues.push(optimizedText);
        paramCount++;
      }

      if (templateId !== undefined) {
        updateFields.push(`template_id = $${paramCount}`);
        updateValues.push(templateId);
        paramCount++;
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id, userId);

      const updateQuery = `
        UPDATE cvs 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING id, title, original_text, optimized_text, template_id, status, updated_at
      `;

      const updateResult = await client.query(updateQuery, updateValues);
      const updatedCV = updateResult.rows[0];

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_UPDATED',
          'cv',
          id,
          JSON.stringify({ updatedFields: Object.keys(req.body) }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'CV updated successfully',
        data: {
          cv: {
            id: updatedCV.id,
            title: updatedCV.title,
            originalText: updatedCV.original_text,
            optimizedText: updatedCV.optimized_text,
            templateId: updatedCV.template_id,
            status: updatedCV.status,
            updatedAt: updatedCV.updated_at
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating CV'
      });
    } finally {
      client.release();
    }
  }

  static async deleteCV(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userId = req.userId;

      // Check if CV exists and belongs to user
      const cvResult = await client.query(
        'SELECT id, title FROM cvs WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (cvResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'CV not found'
        });
      }

      const cv = cvResult.rows[0];

      // Delete CV
      await client.query('DELETE FROM cvs WHERE id = $1 AND user_id = $2', [id, userId]);

      // Decrement user's CV upload count
      await client.query(
        'UPDATE users SET cv_upload_count = GREATEST(0, cv_upload_count - 1) WHERE id = $1',
        [userId]
      );

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_DELETED',
          'cv',
          id,
          JSON.stringify({ title: cv.title }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'CV deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting CV'
      });
    } finally {
      client.release();
    }
  }

  static async downloadCV(req, res) {
    try {
      const { id } = req.params;
      const { template = 'professional', format = 'pdf' } = req.query;
      const userId = req.userId;

      // Verify CV exists and belongs to user
      const cvResult = await pool.query(
        'SELECT id, title, original_text, optimized_text, status FROM cvs WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (cvResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'CV not found'
        });
      }

      const cv = cvResult.rows[0];
      const cvText = cv.optimized_text || cv.original_text;

      if (!cvText) {
        return res.status(400).json({
          success: false,
          message: 'CV content is empty. Please upload or create CV content first.'
        });
      }

      if (format.toLowerCase() !== 'pdf') {
        return res.status(400).json({
          success: false,
          message: 'Only PDF format is currently supported'
        });
      }

      // Generate PDF
      console.log(`Generating PDF for CV ${id} using ${template} template`);
      const doc = await pdfService.generateCV(id, userId, template);

      // Set response headers for PDF download
      const filename = `${cv.title || 'CV'}_${template}.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      // Log audit event
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'CV_DOWNLOADED',
          'cv',
          id,
          JSON.stringify({ template, format, filename }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      // Stream PDF to response
      doc.pipe(res);
      doc.end();

    } catch (error) {
      console.error('Download CV error:', error);
      
      if (error.message === 'CV not found' || error.message === 'CV content is empty') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during PDF generation'
      });
    }
  }

  static async previewCV(req, res) {
    try {
      const { id } = req.params;
      const { template = 'professional' } = req.query;
      const userId = req.userId;

      // Generate PDF for preview (inline display)
      const doc = await pdfService.generateCV(id, userId, template);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

      doc.pipe(res);
      doc.end();

    } catch (error) {
      console.error('Preview CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during PDF preview'
      });
    }
  }

  static async getTemplates(req, res) {
    try {
      const templatesResult = await pool.query(
        'SELECT id, name, description, preview_url FROM templates WHERE is_active = TRUE ORDER BY id'
      );

      const templates = templatesResult.rows.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        previewUrl: template.preview_url,
        type: template.name.toLowerCase().replace(/\s+/g, '_')
      }));

      res.json({
        success: true,
        data: {
          templates,
          count: templates.length
        }
      });

    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving templates'
      });
    }
  }
}

module.exports = CVController;
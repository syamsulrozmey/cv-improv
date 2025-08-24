const pool = require('../config/database');

class ApplicationController {
  static async getApplications(req, res) {
    try {
      const userId = req.userId;
      const { status, cvId, jobId } = req.query;

      let query = `
        SELECT a.id, a.status, a.notes, a.application_date, a.created_at, a.updated_at,
               c.id as cv_id, c.title as cv_title,
               j.id as job_id, j.title as job_title, j.company as job_company, j.url as job_url
        FROM applications a
        JOIN cvs c ON a.cv_id = c.id
        JOIN jobs j ON a.job_id = j.id
        WHERE a.user_id = $1
      `;
      
      const queryParams = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND a.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }

      if (cvId) {
        query += ` AND a.cv_id = $${paramCount}`;
        queryParams.push(cvId);
        paramCount++;
      }

      if (jobId) {
        query += ` AND a.job_id = $${paramCount}`;
        queryParams.push(jobId);
        paramCount++;
      }

      query += ' ORDER BY a.updated_at DESC';

      const result = await pool.query(query, queryParams);

      // Group applications by status for Kanban board
      const kanbanData = {
        applied: [],
        interviewing: [],
        offer: [],
        rejected: []
      };

      result.rows.forEach(row => {
        const application = {
          id: row.id,
          status: row.status,
          notes: row.notes,
          applicationDate: row.application_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          cv: {
            id: row.cv_id,
            title: row.cv_title
          },
          job: {
            id: row.job_id,
            title: row.job_title,
            company: row.job_company,
            url: row.job_url
          }
        };

        if (kanbanData[row.status]) {
          kanbanData[row.status].push(application);
        }
      });

      // Calculate statistics
      const stats = {
        total: result.rows.length,
        applied: kanbanData.applied.length,
        interviewing: kanbanData.interviewing.length,
        offer: kanbanData.offer.length,
        rejected: kanbanData.rejected.length,
        successRate: result.rows.length > 0 ? 
          Math.round((kanbanData.offer.length / result.rows.length) * 100) : 0
      };

      res.json({
        success: true,
        data: {
          kanban: kanbanData,
          applications: result.rows.map(row => ({
            id: row.id,
            status: row.status,
            notes: row.notes,
            applicationDate: row.application_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            cv: {
              id: row.cv_id,
              title: row.cv_title
            },
            job: {
              id: row.job_id,
              title: row.job_title,
              company: row.job_company,
              url: row.job_url
            }
          })),
          stats
        }
      });

    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving applications'
      });
    }
  }

  static async createApplication(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { cvId, jobId, status = 'applied', notes } = req.body;
      const userId = req.userId;

      // Verify CV belongs to user
      const cvResult = await client.query(
        'SELECT id, title FROM cvs WHERE id = $1 AND user_id = $2',
        [cvId, userId]
      );

      if (cvResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'CV not found or does not belong to you'
        });
      }

      // Verify job belongs to user
      const jobResult = await client.query(
        'SELECT id, title, company FROM jobs WHERE id = $1 AND user_id = $2',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Job not found or does not belong to you'
        });
      }

      // Check if application already exists
      const existingApp = await client.query(
        'SELECT id FROM applications WHERE user_id = $1 AND cv_id = $2 AND job_id = $3',
        [userId, cvId, jobId]
      );

      if (existingApp.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Application already exists for this CV and job combination'
        });
      }

      // Create application
      const applicationResult = await client.query(
        `INSERT INTO applications (user_id, cv_id, job_id, status, notes, application_date) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) 
         RETURNING id, status, notes, application_date, created_at`,
        [userId, cvId, jobId, status, notes]
      );

      const application = applicationResult.rows[0];

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'APPLICATION_CREATED',
          'application',
          application.id,
          JSON.stringify({ 
            cvId, 
            jobId, 
            status,
            cvTitle: cvResult.rows[0].title,
            jobTitle: jobResult.rows[0].title,
            company: jobResult.rows[0].company
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: {
          application: {
            id: application.id,
            status: application.status,
            notes: application.notes,
            applicationDate: application.application_date,
            createdAt: application.created_at,
            cv: {
              id: cvResult.rows[0].id,
              title: cvResult.rows[0].title
            },
            job: {
              id: jobResult.rows[0].id,
              title: jobResult.rows[0].title,
              company: jobResult.rows[0].company
            }
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating application'
      });
    } finally {
      client.release();
    }
  }

  static async updateApplication(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.userId;

      // Check if application exists and belongs to user
      const existingApp = await client.query(
        'SELECT id, status FROM applications WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (existingApp.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const oldStatus = existingApp.rows[0].status;

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        updateValues.push(status);
        paramCount++;
      }

      if (notes !== undefined) {
        updateFields.push(`notes = $${paramCount}`);
        updateValues.push(notes);
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
        UPDATE applications 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING id, status, notes, application_date, updated_at
      `;

      const updateResult = await client.query(updateQuery, updateValues);
      const updatedApp = updateResult.rows[0];

      // Log audit event for status changes
      if (status && status !== oldStatus) {
        await client.query(
          'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            userId,
            'APPLICATION_STATUS_CHANGED',
            'application',
            id,
            JSON.stringify({ oldStatus, newStatus: status }),
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent')
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Application updated successfully',
        data: {
          application: {
            id: updatedApp.id,
            status: updatedApp.status,
            notes: updatedApp.notes,
            applicationDate: updatedApp.application_date,
            updatedAt: updatedApp.updated_at
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating application'
      });
    } finally {
      client.release();
    }
  }

  static async deleteApplication(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userId = req.userId;

      // Check if application exists and belongs to user
      const applicationResult = await client.query(
        'SELECT id FROM applications WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (applicationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Delete application
      await client.query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [id, userId]);

      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          userId,
          'APPLICATION_DELETED',
          'application',
          id,
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Application deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting application'
      });
    } finally {
      client.release();
    }
  }

  static async getAnalytics(req, res) {
    try {
      const userId = req.userId;
      const { period = '30' } = req.query; // days

      // Get application statistics
      const statsQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(CASE WHEN status = 'offer' THEN 1.0 ELSE 0.0 END) as success_rate
        FROM applications 
        WHERE user_id = $1 
          AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        GROUP BY status
      `;

      const statsResult = await pool.query(statsQuery, [userId]);

      // Get timeline data
      const timelineQuery = `
        SELECT 
          DATE(created_at) as date,
          status,
          COUNT(*) as count
        FROM applications 
        WHERE user_id = $1 
          AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        GROUP BY DATE(created_at), status
        ORDER BY date DESC
      `;

      const timelineResult = await pool.query(timelineQuery, [userId]);

      // Process statistics
      const statusStats = {
        applied: 0,
        interviewing: 0,
        offer: 0,
        rejected: 0
      };

      let totalApplications = 0;
      let totalOffers = 0;

      statsResult.rows.forEach(row => {
        statusStats[row.status] = parseInt(row.count);
        totalApplications += parseInt(row.count);
        if (row.status === 'offer') {
          totalOffers = parseInt(row.count);
        }
      });

      const successRate = totalApplications > 0 ? 
        Math.round((totalOffers / totalApplications) * 100) : 0;

      // Process timeline data
      const timelineData = {};
      timelineResult.rows.forEach(row => {
        if (!timelineData[row.date]) {
          timelineData[row.date] = {};
        }
        timelineData[row.date][row.status] = parseInt(row.count);
      });

      res.json({
        success: true,
        data: {
          period: parseInt(period),
          summary: {
            total: totalApplications,
            ...statusStats,
            successRate
          },
          timeline: timelineData
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving analytics'
      });
    }
  }
}

module.exports = ApplicationController;
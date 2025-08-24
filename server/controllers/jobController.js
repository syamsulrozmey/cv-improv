const pool = require('../config/database');
const axios = require('axios');
const cheerio = require('cheerio');

class JobController {
  static async createJob(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { title, company, url, description } = req.body;
      const userId = req.userId;
      
      // Parse requirements and skills from job description
      const parsedRequirements = JobController.parseJobRequirements(description);
      const skillsRequired = JobController.extractSkills(description);
      
      // Create job record
      const jobResult = await client.query(
        `INSERT INTO jobs (user_id, title, company, url, description, parsed_requirements, skills_required) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, title, company, url, description, parsed_requirements, skills_required, created_at`,
        [
          userId,
          title || null,
          company || null,
          url || null,
          description,
          JSON.stringify(parsedRequirements),
          skillsRequired
        ]
      );
      
      const job = jobResult.rows[0];
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'JOB_CREATED',
          'job',
          job.id,
          JSON.stringify({ title: job.title, company: job.company, hasUrl: !!job.url }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Job description saved successfully',
        data: {
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description,
            parsedRequirements: job.parsed_requirements,
            skillsRequired: job.skills_required,
            createdAt: job.created_at
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create job error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating job'
      });
    } finally {
      client.release();
    }
  }

  static async scrapeJob(req, res) {
    const client = await pool.connect();
    
    try {
      const { url } = req.body;
      const userId = req.userId;
      
      console.log(`Attempting to scrape job from URL: ${url}`);
      
      // Scrape job data from URL
      const scrapedData = await JobController.scrapeJobFromUrl(url);
      
      if (!scrapedData.description) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract job description from the provided URL. Please try copying the job description manually.'
        });
      }

      await client.query('BEGIN');
      
      // Parse requirements and skills
      const parsedRequirements = JobController.parseJobRequirements(scrapedData.description);
      const skillsRequired = JobController.extractSkills(scrapedData.description);
      
      // Create job record
      const jobResult = await client.query(
        `INSERT INTO jobs (user_id, title, company, url, description, parsed_requirements, skills_required) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, title, company, url, description, parsed_requirements, skills_required, created_at`,
        [
          userId,
          scrapedData.title || null,
          scrapedData.company || null,
          url,
          scrapedData.description,
          JSON.stringify(parsedRequirements),
          skillsRequired
        ]
      );
      
      const job = jobResult.rows[0];
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          userId,
          'JOB_SCRAPED',
          'job',
          job.id,
          JSON.stringify({ 
            url,
            title: job.title,
            company: job.company,
            scrapedDataLength: scrapedData.description.length
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Job scraped and saved successfully',
        data: {
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description,
            parsedRequirements: job.parsed_requirements,
            skillsRequired: job.skills_required,
            createdAt: job.created_at
          },
          scrapeInfo: {
            source: JobController.getJobSiteFromUrl(url),
            dataExtracted: {
              title: !!scrapedData.title,
              company: !!scrapedData.company,
              description: !!scrapedData.description
            }
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Scrape job error:', error);
      
      if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
        return res.status(400).json({
          success: false,
          message: 'Unable to access the provided URL. Please check the URL and try again, or copy the job description manually.',
          error: 'NETWORK_ERROR'
        });
      }
      
      if (error.message.includes('blocked') || error.message.includes('403')) {
        return res.status(400).json({
          success: false,
          message: 'Access to this job site is restricted. Please copy the job description manually.',
          error: 'ACCESS_BLOCKED'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while scraping job. Please try copying the job description manually.',
        error: 'SCRAPING_ERROR'
      });
    } finally {
      client.release();
    }
  }

  static async getJobs(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, title, company, url, description, skills_required, created_at, updated_at,
               LENGTH(description) as description_length
        FROM jobs 
        WHERE user_id = $1
      `;
      
      let queryParams = [userId];
      let paramCount = 2;

      // Add search functionality
      if (search) {
        query += ` AND (title ILIKE $${paramCount} OR company ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY updated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const jobsResult = await pool.query(query, queryParams);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM jobs WHERE user_id = $1';
      let countParams = [userId];
      
      if (search) {
        countQuery += ' AND (title ILIKE $2 OR company ILIKE $2 OR description ILIKE $2)';
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          jobs: jobsResult.rows.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description.substring(0, 300) + (job.description.length > 300 ? '...' : ''),
            skillsRequired: job.skills_required,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
            stats: {
              descriptionLength: job.description_length
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
      console.error('Get jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving jobs'
      });
    }
  }

  static async getJob(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const jobResult = await pool.query(
        `SELECT id, title, company, url, description, parsed_requirements, skills_required, created_at, updated_at
         FROM jobs 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const job = jobResult.rows[0];

      res.json({
        success: true,
        data: {
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description,
            parsedRequirements: job.parsed_requirements,
            skillsRequired: job.skills_required,
            createdAt: job.created_at,
            updatedAt: job.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving job'
      });
    }
  }

  // Helper method to scrape job data from various job sites
  static async scrapeJobFromUrl(url) {
    const timeout = 10000; // 10 seconds timeout
    
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Determine job site and use appropriate selectors
      const jobSite = JobController.getJobSiteFromUrl(url);
      let scrapedData = { title: '', company: '', description: '' };
      
      switch (jobSite) {
        case 'linkedin':
          scrapedData = JobController.scrapeLinkedIn($);
          break;
        case 'indeed':
          scrapedData = JobController.scrapeIndeed($);
          break;
        case 'glassdoor':
          scrapedData = JobController.scrapeGlassdoor($);
          break;
        case 'monster':
          scrapedData = JobController.scrapeMonster($);
          break;
        case 'ziprecruiter':
          scrapedData = JobController.scrapeZipRecruiter($);
          break;
        default:
          scrapedData = JobController.scrapeGeneric($);
      }
      
      return scrapedData;
      
    } catch (error) {
      console.error(`Scraping error for URL ${url}:`, error.message);
      throw error;
    }
  }

  static getJobSiteFromUrl(url) {
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('indeed.com')) return 'indeed';
    if (url.includes('glassdoor.com')) return 'glassdoor';
    if (url.includes('monster.com')) return 'monster';
    if (url.includes('ziprecruiter.com')) return 'ziprecruiter';
    return 'generic';
  }

  static scrapeLinkedIn($) {
    return {
      title: $('.top-card-layout__title').text().trim() || $('h1').first().text().trim(),
      company: $('.topcard__flavor-row .topcard__flavor--black-link').text().trim() || 
               $('.top-card-layout__card .topcard__org-name-link').text().trim(),
      description: $('.description__text section div').html() || 
                  $('.show-more-less-html__markup').html() ||
                  $('.description').text().trim()
    };
  }

  static scrapeIndeed($) {
    return {
      title: $('[data-testid="jobsearch-JobInfoHeader-title"]').text().trim() || 
             $('.jobsearch-JobInfoHeader-title').text().trim() ||
             $('h1').first().text().trim(),
      company: $('[data-testid="inlineHeader-companyName"]').text().trim() ||
               $('.icl-u-lg-mr--sm').text().trim(),
      description: $('#jobDescriptionText').html() || 
                  $('.jobsearch-jobDescriptionText').html() ||
                  $('.jobsearch-JobComponent-description').html()
    };
  }

  static scrapeGlassdoor($) {
    return {
      title: $('[data-test="job-title"]').text().trim() || 
             $('.css-17x2pwl').text().trim() ||
             $('h2').first().text().trim(),
      company: $('[data-test="employer-name"]').text().trim() ||
               $('.css-l2wjgv').first().text().trim(),
      description: $('[data-test="jobDescription"]').html() ||
                  $('.desc').html() ||
                  $('.jobDescriptionContent').html()
    };
  }

  static scrapeMonster($) {
    return {
      title: $('[data-testid="svx-job-header-job-title"]').text().trim() ||
             $('.job-header-title').text().trim() ||
             $('h1').first().text().trim(),
      company: $('[data-testid="svx-job-header-company-name"]').text().trim() ||
               $('.company').text().trim(),
      description: $('[data-testid="svx-job-description"]').html() ||
                  $('.job-description').html() ||
                  $('.description').html()
    };
  }

  static scrapeZipRecruiter($) {
    return {
      title: $('.job_title').text().trim() || $('h1').first().text().trim(),
      company: $('.hiring_company_text').text().trim() || $('.company').text().trim(),
      description: $('.job_description').html() || $('.description').html()
    };
  }

  static scrapeGeneric($) {
    // Generic scraping for unknown job sites
    const title = $('h1').first().text().trim() || 
                  $('[class*="title"]').first().text().trim() ||
                  $('[class*="job-title"]').first().text().trim();
    
    const company = $('[class*="company"]').first().text().trim() ||
                   $('[class*="employer"]').first().text().trim();
    
    const description = $('[class*="description"]').first().html() ||
                       $('[class*="job-description"]').first().html() ||
                       $('main').html() ||
                       $('article').html() ||
                       $('body').html();
    
    return { title, company, description };
  }

  static parseJobRequirements(description) {
    const requirements = {
      education: [],
      experience: [],
      skills: [],
      certifications: []
    };

    const text = description.toLowerCase();

    // Extract education requirements
    const educationPatterns = [
      /bachelor['']?s?\s+degree/gi,
      /master['']?s?\s+degree/gi,
      /phd|doctorate/gi,
      /associate['']?s?\s+degree/gi,
      /high school diploma/gi
    ];

    educationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        requirements.education.push(...matches);
      }
    });

    // Extract experience requirements
    const experiencePattern = /(\d+)[-\s]*(?:to|-)?(?:\s*)?(\d+)?\+?\s*years?\s+(?:of\s+)?experience/gi;
    let match;
    while ((match = experiencePattern.exec(text)) !== null) {
      requirements.experience.push(match[0]);
    }

    // Extract certifications
    const certificationPatterns = [
      /aws certified/gi,
      /microsoft certified/gi,
      /google analytics/gi,
      /pmp certified/gi,
      /cissp/gi,
      /comptia/gi
    ];

    certificationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        requirements.certifications.push(...matches);
      }
    });

    return requirements;
  }

  static extractSkills(description) {
    const skills = [];
    const text = description.toLowerCase();

    const skillPatterns = [
      // Programming languages
      'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'typescript',
      // Frameworks and libraries
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
      // Databases
      'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      // Cloud platforms
      'aws', 'azure', 'gcp', 'docker', 'kubernetes',
      // Tools
      'git', 'jira', 'confluence', 'jenkins', 'terraform',
      // Soft skills
      'communication', 'leadership', 'project management', 'problem solving'
    ];

    skillPatterns.forEach(skill => {
      if (text.includes(skill)) {
        skills.push(skill);
      }
    });

    return [...new Set(skills)]; // Remove duplicates
  }
}

module.exports = JobController;
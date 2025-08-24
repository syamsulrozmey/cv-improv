const PDFDocument = require('pdfkit');
const pool = require('../config/database');

class PDFService {
  constructor() {
    this.pageWidth = 612; // 8.5 inches
    this.pageHeight = 792; // 11 inches
    this.margins = {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    };
    this.contentWidth = this.pageWidth - this.margins.left - this.margins.right;
  }

  async generateCV(cvId, userId, template = 'professional') {
    // Get CV data
    const cvResult = await pool.query(
      `SELECT c.*, t.name as template_name, t.template_data 
       FROM cvs c
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [cvId, userId]
    );

    if (cvResult.rows.length === 0) {
      throw new Error('CV not found');
    }

    const cv = cvResult.rows[0];
    const cvText = cv.optimized_text || cv.original_text;

    if (!cvText) {
      throw new Error('CV content is empty');
    }

    // Parse CV content
    const cvData = this.parseCV(cvText);
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: this.margins,
      info: {
        Title: cv.title || 'CV',
        Author: 'CV Improv',
        Subject: 'Professional CV',
        Keywords: 'CV, Resume, Professional',
        CreationDate: new Date(),
        ModDate: new Date()
      }
    });

    // Generate PDF based on template
    await this.generateTemplate(doc, cvData, cv, template);

    return doc;
  }

  parseCV(cvText) {
    const sections = {
      personal: {},
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      other: []
    };

    const lines = cvText.split('\n').map(line => line.trim()).filter(line => line);
    let currentSection = 'other';
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Detect section headers
      if (this.isSectionHeader(lowerLine)) {
        currentSection = this.identifySection(lowerLine);
        currentItem = null;
        continue;
      }

      // Extract personal information from the beginning
      if (i < 10 && currentSection === 'other') {
        if (this.isEmail(line)) {
          sections.personal.email = line;
          continue;
        }
        if (this.isPhone(line)) {
          sections.personal.phone = line;
          continue;
        }
        if (this.isName(line, i)) {
          sections.personal.name = line;
          continue;
        }
        if (this.isLocation(line)) {
          sections.personal.location = line;
          continue;
        }
      }

      // Process content based on current section
      switch (currentSection) {
        case 'summary':
          sections.summary += (sections.summary ? ' ' : '') + line;
          break;
        
        case 'experience':
          const expItem = this.parseExperienceItem(line, lines, i);
          if (expItem) {
            sections.experience.push(expItem);
            currentItem = expItem;
          } else if (currentItem) {
            currentItem.description += '\n' + line;
          }
          break;
        
        case 'education':
          const eduItem = this.parseEducationItem(line);
          if (eduItem) {
            sections.education.push(eduItem);
          }
          break;
        
        case 'skills':
          sections.skills = sections.skills.concat(this.parseSkills(line));
          break;
        
        case 'certifications':
          sections.certifications.push(line);
          break;
        
        case 'projects':
          sections.projects.push(line);
          break;
        
        default:
          sections.other.push(line);
      }
    }

    return sections;
  }

  isSectionHeader(line) {
    const headers = [
      'experience', 'work experience', 'employment', 'professional experience',
      'education', 'academic background', 'qualifications',
      'skills', 'technical skills', 'core competencies', 'key skills',
      'summary', 'profile', 'objective', 'professional summary',
      'certifications', 'certificates', 'licenses',
      'projects', 'key projects', 'notable projects',
      'achievements', 'accomplishments', 'awards'
    ];

    return headers.some(header => 
      line === header || line.startsWith(header) || line.includes(header)
    );
  }

  identifySection(line) {
    if (line.includes('experience') || line.includes('employment')) return 'experience';
    if (line.includes('education') || line.includes('academic')) return 'education';
    if (line.includes('skill') || line.includes('competenc')) return 'skills';
    if (line.includes('summary') || line.includes('profile') || line.includes('objective')) return 'summary';
    if (line.includes('certification') || line.includes('certificate') || line.includes('license')) return 'certifications';
    if (line.includes('project')) return 'projects';
    return 'other';
  }

  isEmail(text) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }

  isPhone(text) {
    return /[\+]?[1-9][\d]{3,14}/.test(text.replace(/[\s\-\(\)\.]/g, ''));
  }

  isName(text, index) {
    // Assume the first line is likely a name if it's not an email/phone
    return index === 0 && text.length < 50 && !this.isEmail(text) && !this.isPhone(text);
  }

  isLocation(text) {
    return text.includes(',') && (text.includes('City') || text.includes('State') || text.length < 100);
  }

  parseExperienceItem(line, lines, index) {
    // Look for job title, company, dates pattern
    if (line.includes('|') || line.includes('-') || line.includes('at ')) {
      const parts = line.split(/[\|\-]|at\s+/);
      if (parts.length >= 2) {
        return {
          title: parts[0].trim(),
          company: parts[1].trim(),
          dates: parts[2]?.trim() || '',
          description: ''
        };
      }
    }
    
    // Check if next line might contain company/dates
    if (index < lines.length - 1) {
      const nextLine = lines[index + 1];
      if (nextLine.includes('2020') || nextLine.includes('2021') || nextLine.includes('2022') || nextLine.includes('2023') || nextLine.includes('2024')) {
        return {
          title: line,
          company: '',
          dates: nextLine,
          description: ''
        };
      }
    }
    
    return null;
  }

  parseEducationItem(line) {
    if (line.includes('University') || line.includes('College') || line.includes('Degree') || 
        line.includes('Bachelor') || line.includes('Master') || line.includes('PhD')) {
      return {
        degree: line,
        institution: '',
        year: ''
      };
    }
    return null;
  }

  parseSkills(line) {
    // Split by common delimiters
    const skills = line.split(/[,;•·\-\|]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1);
    
    return skills;
  }

  async generateTemplate(doc, cvData, cv, templateType) {
    switch (templateType) {
      case 'modern':
        await this.generateModernTemplate(doc, cvData, cv);
        break;
      case 'executive':
        await this.generateExecutiveTemplate(doc, cvData, cv);
        break;
      case 'creative':
        await this.generateCreativeTemplate(doc, cvData, cv);
        break;
      default:
        await this.generateProfessionalTemplate(doc, cvData, cv);
    }
  }

  async generateProfessionalTemplate(doc, cvData, cv) {
    let yPosition = this.margins.top;
    const lineHeight = 14;
    const sectionSpacing = 20;

    // Header with personal information
    if (cvData.personal.name) {
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text(cvData.personal.name, this.margins.left, yPosition);
      yPosition += 30;
    }

    // Contact information
    const contactInfo = [];
    if (cvData.personal.email) contactInfo.push(cvData.personal.email);
    if (cvData.personal.phone) contactInfo.push(cvData.personal.phone);
    if (cvData.personal.location) contactInfo.push(cvData.personal.location);

    if (contactInfo.length > 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#34495e')
         .text(contactInfo.join(' | '), this.margins.left, yPosition);
      yPosition += 25;
    }

    // Horizontal line
    doc.moveTo(this.margins.left, yPosition)
       .lineTo(this.pageWidth - this.margins.right, yPosition)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();
    yPosition += 15;

    // Professional Summary
    if (cvData.summary) {
      yPosition = this.addSection(doc, 'PROFESSIONAL SUMMARY', cvData.summary, yPosition, 'paragraph');
      yPosition += sectionSpacing;
    }

    // Experience
    if (cvData.experience.length > 0) {
      yPosition = this.addSectionHeader(doc, 'PROFESSIONAL EXPERIENCE', yPosition);
      
      for (const exp of cvData.experience) {
        // Check if we need a new page
        if (yPosition > this.pageHeight - 150) {
          doc.addPage();
          yPosition = this.margins.top;
        }

        // Job title and company
        if (exp.title) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#2c3e50')
             .text(exp.title, this.margins.left, yPosition);
          yPosition += lineHeight;
        }

        if (exp.company || exp.dates) {
          const companyLine = [exp.company, exp.dates].filter(Boolean).join(' | ');
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#7f8c8d')
             .text(companyLine, this.margins.left, yPosition);
          yPosition += lineHeight;
        }

        // Description
        if (exp.description.trim()) {
          yPosition += 5;
          const descLines = this.wrapText(doc, exp.description, this.contentWidth - 20, 10);
          for (const line of descLines) {
            if (yPosition > this.pageHeight - 50) {
              doc.addPage();
              yPosition = this.margins.top;
            }
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#2c3e50')
               .text('• ' + line, this.margins.left + 15, yPosition);
            yPosition += lineHeight;
          }
        }
        yPosition += 10;
      }
      yPosition += sectionSpacing;
    }

    // Education
    if (cvData.education.length > 0) {
      yPosition = this.addSectionHeader(doc, 'EDUCATION', yPosition);
      
      for (const edu of cvData.education) {
        if (yPosition > this.pageHeight - 100) {
          doc.addPage();
          yPosition = this.margins.top;
        }

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text(edu.degree || edu.institution, this.margins.left, yPosition);
        yPosition += lineHeight + 5;
      }
      yPosition += sectionSpacing;
    }

    // Skills
    if (cvData.skills.length > 0) {
      yPosition = this.addSectionHeader(doc, 'TECHNICAL SKILLS', yPosition);
      
      const skillsText = cvData.skills.join(' • ');
      const skillsLines = this.wrapText(doc, skillsText, this.contentWidth, 10);
      
      for (const line of skillsLines) {
        if (yPosition > this.pageHeight - 50) {
          doc.addPage();
          yPosition = this.margins.top;
        }
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#2c3e50')
           .text(line, this.margins.left, yPosition);
        yPosition += lineHeight;
      }
      yPosition += sectionSpacing;
    }

    // Certifications
    if (cvData.certifications.length > 0) {
      yPosition = this.addSectionHeader(doc, 'CERTIFICATIONS', yPosition);
      
      for (const cert of cvData.certifications) {
        if (yPosition > this.pageHeight - 50) {
          doc.addPage();
          yPosition = this.margins.top;
        }
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#2c3e50')
           .text('• ' + cert, this.margins.left, yPosition);
        yPosition += lineHeight;
      }
    }

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#95a5a6')
       .text('Generated by CV Improv - AI-Powered CV Optimization', 
             this.margins.left, 
             this.pageHeight - this.margins.bottom + 20);
  }

  async generateModernTemplate(doc, cvData, cv) {
    // Modern template with color accents and clean design
    const accentColor = '#3498db';
    let yPosition = this.margins.top;

    // Header with colored background
    doc.rect(0, 0, this.pageWidth, 80)
       .fillColor(accentColor)
       .fill();

    // Name in white on colored background
    if (cvData.personal.name) {
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text(cvData.personal.name, this.margins.left, 25);
    }

    // Contact in white
    const contactInfo = [];
    if (cvData.personal.email) contactInfo.push(cvData.personal.email);
    if (cvData.personal.phone) contactInfo.push(cvData.personal.phone);
    if (cvData.personal.location) contactInfo.push(cvData.personal.location);

    if (contactInfo.length > 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#ffffff')
         .text(contactInfo.join(' | '), this.margins.left, 55);
    }

    yPosition = 100;

    // Continue with sections using accent color for headers
    this.accentColor = accentColor;
    await this.generateProfessionalTemplate(doc, cvData, cv);
  }

  async generateExecutiveTemplate(doc, cvData, cv) {
    // Executive template with traditional, formal styling
    await this.generateProfessionalTemplate(doc, cvData, cv);
  }

  async generateCreativeTemplate(doc, cvData, cv) {
    // Creative template with modern typography and layout
    const accentColor = '#e74c3c';
    this.accentColor = accentColor;
    await this.generateProfessionalTemplate(doc, cvData, cv);
  }

  addSectionHeader(doc, title, yPosition) {
    const color = this.accentColor || '#2c3e50';
    
    if (yPosition > this.pageHeight - 100) {
      doc.addPage();
      yPosition = this.margins.top;
    }

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(color)
       .text(title, this.margins.left, yPosition);
    
    yPosition += 18;
    
    // Underline
    doc.moveTo(this.margins.left, yPosition - 3)
       .lineTo(this.margins.left + 100, yPosition - 3)
       .strokeColor(color)
       .lineWidth(2)
       .stroke();
    
    return yPosition + 10;
  }

  addSection(doc, title, content, yPosition, type = 'paragraph') {
    yPosition = this.addSectionHeader(doc, title, yPosition);
    
    if (type === 'paragraph') {
      const lines = this.wrapText(doc, content, this.contentWidth, 10);
      for (const line of lines) {
        if (yPosition > this.pageHeight - 50) {
          doc.addPage();
          yPosition = this.margins.top;
        }
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#2c3e50')
           .text(line, this.margins.left, yPosition);
        yPosition += 14;
      }
    }
    
    return yPosition;
  }

  wrapText(doc, text, maxWidth, fontSize) {
    doc.fontSize(fontSize);
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = doc.widthOfString(testLine);
      
      if (lineWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
}

module.exports = new PDFService();
const OpenAI = require('openai');
const config = require('../config/config');

class AIService {
  constructor() {
    if (!config.openai.apiKey) {
      console.warn('OpenAI API key not found. AI features will be disabled.');
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Rate limiting tracking
    this.rateLimitInfo = {
      requestsToday: 0,
      lastResetDate: new Date().toDateString()
    };
  }

  async analyzeCompatibility(cvText, jobDescription) {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured. Please add your OpenAI API key.');
    }

    this.checkRateLimit();

    const prompt = this.buildCompatibilityPrompt(cvText, jobDescription);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional HR expert and career counselor specializing in CV optimization and job matching. You provide detailed, actionable feedback to help candidates improve their job application success rate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      this.incrementRateLimit();
      
      const analysis = this.parseCompatibilityResponse(response.choices[0].message.content);
      return analysis;

    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      if (error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      }
      throw new Error('AI analysis failed. Please try again.');
    }
  }

  async optimizeCV(cvText, jobDescription, analysisData) {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured. Please add your OpenAI API key.');
    }

    this.checkRateLimit();

    const prompt = this.buildOptimizationPrompt(cvText, jobDescription, analysisData);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert CV writer and ATS optimization specialist. Your goal is to rewrite CVs to maximize ATS compatibility while maintaining readability and professional tone. Focus on keyword optimization, quantified achievements, and industry-specific terminology.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      this.incrementRateLimit();
      
      const optimizedContent = this.parseOptimizationResponse(response.choices[0].message.content);
      return optimizedContent;

    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      throw new Error('CV optimization failed. Please try again.');
    }
  }

  buildCompatibilityPrompt(cvText, jobDescription) {
    return `
Please analyze the compatibility between this CV and job description. Provide a comprehensive assessment including:

**CV TEXT:**
${cvText}

**JOB DESCRIPTION:**
${jobDescription}

**ANALYSIS REQUIRED:**

1. **COMPATIBILITY SCORE (0-100)**: Overall match percentage with detailed reasoning

2. **SKILL ANALYSIS**:
   - Skills present in CV that match job requirements
   - Missing critical skills from CV
   - Skill gaps that need addressing

3. **EXPERIENCE ALIGNMENT**:
   - Relevant experience that matches job requirements
   - Experience gaps or misalignments
   - Years of experience assessment

4. **KEYWORD ANALYSIS**:
   - Important keywords from job description missing in CV
   - ATS optimization opportunities
   - Industry-specific terms to include

5. **CERTIFICATION SUGGESTIONS**:
   - Specific certifications mentioned in job description
   - Recommended certifications based on role (AWS, Google Analytics, PMP, etc.)
   - Priority level for each certification

6. **IMPROVEMENT RECOMMENDATIONS**:
   - Specific areas to strengthen in CV
   - Content restructuring suggestions
   - Achievement quantification opportunities

**RESPONSE FORMAT:** Please structure your response as valid JSON with the following format:
{
  "compatibilityScore": number,
  "skillsMatching": ["skill1", "skill2"],
  "skillsGaps": ["missing_skill1", "missing_skill2"],
  "keywordGaps": ["keyword1", "keyword2"],
  "experienceAssessment": {
    "relevantYears": number,
    "alignment": "high|medium|low",
    "gaps": ["gap1", "gap2"]
  },
  "certificationSuggestions": [
    {
      "name": "certification_name",
      "priority": "high|medium|low",
      "reason": "explanation"
    }
  ],
  "recommendations": [
    {
      "category": "skills|experience|format|content",
      "suggestion": "specific_recommendation",
      "impact": "high|medium|low"
    }
  ],
  "summary": "Overall assessment summary"
}
`;
  }

  buildOptimizationPrompt(cvText, jobDescription, analysisData) {
    return `
Based on the compatibility analysis, please optimize this CV to better match the job requirements while maintaining ATS compatibility and professional readability.

**ORIGINAL CV:**
${cvText}

**TARGET JOB:**
${jobDescription}

**ANALYSIS DATA:**
${JSON.stringify(analysisData, null, 2)}

**OPTIMIZATION REQUIREMENTS:**

1. **ATS OPTIMIZATION**: Incorporate missing keywords naturally throughout the CV
2. **SKILL ENHANCEMENT**: Emphasize relevant skills and add missing ones where appropriate
3. **ACHIEVEMENT QUANTIFICATION**: Add metrics and numbers where possible
4. **PROFESSIONAL FORMATTING**: Maintain clean, scannable structure
5. **KEYWORD DENSITY**: Optimize for ATS without keyword stuffing
6. **INDUSTRY ALIGNMENT**: Use industry-specific terminology and standards

**GUIDELINES:**
- Keep the same general structure and length
- Maintain truthfulness - don't fabricate experience
- Focus on relevant achievements and skills
- Use action verbs and quantifiable results
- Ensure natural language flow
- Optimize for both ATS and human readers

**RESPONSE FORMAT:** Please provide the optimized CV text in the following JSON format:
{
  "optimizedCV": "full_optimized_cv_text",
  "changesExplanation": [
    {
      "section": "section_name",
      "changes": "description_of_changes",
      "reasoning": "why_these_changes_help"
    }
  ],
  "keywordOptimizations": ["keyword1", "keyword2"],
  "atsScore": number,
  "readabilityScore": number
}
`;
  }

  parseCompatibilityResponse(responseText) {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing compatibility response:', error);
      // Fallback response structure
      return {
        compatibilityScore: 0,
        skillsMatching: [],
        skillsGaps: [],
        keywordGaps: [],
        experienceAssessment: {
          relevantYears: 0,
          alignment: 'low',
          gaps: []
        },
        certificationSuggestions: [],
        recommendations: [],
        summary: 'Analysis parsing failed. Please try again.',
        error: 'Response parsing error'
      };
    }
  }

  parseOptimizationResponse(responseText) {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing optimization response:', error);
      // Fallback response structure
      return {
        optimizedCV: responseText,
        changesExplanation: [
          {
            section: 'general',
            changes: 'Unable to parse detailed changes',
            reasoning: 'Response parsing error occurred'
          }
        ],
        keywordOptimizations: [],
        atsScore: 0,
        readabilityScore: 0,
        error: 'Response parsing error'
      };
    }
  }

  checkRateLimit() {
    const today = new Date().toDateString();
    if (this.rateLimitInfo.lastResetDate !== today) {
      this.rateLimitInfo.requestsToday = 0;
      this.rateLimitInfo.lastResetDate = today;
    }

    // Example limit: 100 requests per day for development
    if (this.rateLimitInfo.requestsToday >= 100) {
      throw new Error('Daily API request limit exceeded. Please try again tomorrow.');
    }
  }

  incrementRateLimit() {
    this.rateLimitInfo.requestsToday++;
  }

  async identifySkillGaps(cvSkills, requiredSkills) {
    const gaps = requiredSkills.filter(skill => 
      !cvSkills.some(cvSkill => 
        cvSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cvSkill.toLowerCase())
      )
    );

    // Categorize skills by importance and suggest certifications
    const skillCategories = {
      technical: ['javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws', 'docker'],
      analytical: ['excel', 'sql', 'tableau', 'python', 'r', 'statistics'],
      management: ['project management', 'leadership', 'agile', 'scrum'],
      marketing: ['google analytics', 'sem', 'social media', 'content marketing']
    };

    const suggestions = gaps.map(skill => {
      const category = Object.keys(skillCategories).find(cat => 
        skillCategories[cat].some(s => s.toLowerCase() === skill.toLowerCase())
      );

      return {
        skill,
        category: category || 'other',
        priority: this.getSkillPriority(skill),
        certificationSuggestions: this.getCertificationSuggestions(skill)
      };
    });

    return suggestions;
  }

  getSkillPriority(skill) {
    const highPrioritySkills = [
      'javascript', 'python', 'react', 'node.js', 'aws', 'sql', 
      'project management', 'google analytics', 'excel'
    ];
    
    return highPrioritySkills.some(s => s.toLowerCase() === skill.toLowerCase()) ? 'high' : 'medium';
  }

  getCertificationSuggestions(skill) {
    const certificationMap = {
      'aws': ['AWS Certified Solutions Architect', 'AWS Certified Developer'],
      'google analytics': ['Google Analytics Individual Qualification', 'Google Ads Certification'],
      'project management': ['PMP Certification', 'Scrum Master Certification'],
      'microsoft office': ['Microsoft Office Specialist'],
      'salesforce': ['Salesforce Administrator', 'Salesforce Developer'],
      'sql': ['Oracle Database Certification', 'Microsoft SQL Server Certification'],
      'digital marketing': ['Google Ads Certification', 'HubSpot Content Marketing'],
      'data analysis': ['Google Data Analytics Certificate', 'IBM Data Science Certificate']
    };

    return certificationMap[skill.toLowerCase()] || [];
  }

  // Calculate ATS-friendly score based on keyword density and formatting
  calculateATSScore(cvText, keywords) {
    const text = cvText.toLowerCase();
    const totalWords = cvText.split(/\s+/).length;
    
    let keywordMatches = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    });

    const keywordDensity = keywordMatches / keywords.length;
    
    // Basic ATS scoring factors
    const factors = {
      keywordDensity: keywordDensity * 40,
      hasContactInfo: text.includes('@') ? 10 : 0,
      hasPhoneNumber: /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) ? 10 : 0,
      properSections: this.checkATSSections(text) * 5,
      readableFormat: text.length > 500 ? 15 : 10,
      bulletPoints: (text.match(/•|·|-\s/g) || []).length > 5 ? 10 : 5
    };

    return Math.min(100, Math.round(Object.values(factors).reduce((sum, score) => sum + score, 0)));
  }

  checkATSSections(text) {
    const standardSections = [
      'experience', 'education', 'skills', 'summary', 'objective',
      'work experience', 'employment', 'qualifications', 'achievements'
    ];

    return standardSections.filter(section => 
      text.includes(section.toLowerCase())
    ).length;
  }
}

module.exports = new AIService();
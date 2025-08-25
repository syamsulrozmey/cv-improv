# N8n Setup Guide for CV Improver
## Import and Configuration Instructions

### Version: 1.0
### Last Updated: July 27, 2025

---

## 🚀 Quick Setup Instructions

### **Step 1: Import the Workflow**
1. Open your N8n instance
2. Click "+" to create new workflow
3. Click "Import from file" or "Import from JSON"
4. Upload `CV_IMPROVER_N8N_WORKFLOW.json`
5. The complete workflow will be imported with all nodes

### **Step 2: Configure API Credentials**

#### **OpenAI Credentials**


#### **Exa Search Credentials**
```json
{
  "name": "Exa Search API", 
  "type": "httpHeaderAuth",
  "data": {
    "name": "X-API-Key",
    "value": "your-exa-api-key-here"
  }
}
```

#### **Supabase Credentials**
```json
{
  "name": "Supabase API",
  "type": "httpHeaderAuth",
  "data": {
    "name": "Authorization",
    "value": "Bearer your-supabase-anon-key"
  }
}
```

### **Step 3: Environment Variables**
Set these in your N8n environment:
```bash
SUPABASE_URL=https://your-project.supabase.co
OPENAI_API_KEY=sk-your-openai-key
EXA_API_KEY=your-exa-api-key
```

---

## 📋 Workflow Node Details

### **Input Format (Webhook)**
```json
{
  "job_description": "Complete job posting text",
  "cv_content": "User's CV content", 
  "user_id": "unique-user-id",
  "session_id": "unique-session-id"
}
```

### **Expected Output Format**
```json
{
  "session_info": {
    "session_id": "abc123",
    "user_id": "user456", 
    "company_name": "Tech Company Inc",
    "processing_status": "completed"
  },
  "cv_improvements": {
    "summary_improvements": "Enhanced summary",
    "experience_enhancements": [...],
    "skills_optimization": {...},
    "achievements_reframing": [...],
    "cultural_fit_indicators": [...]
  },
  "cover_letter": {
    "cover_letter": "Complete cover letter text",
    "key_research_points": [...],
    "personalization_elements": [...],
    "cultural_connections": [...]
  },
  "company_research": {
    "overview": [...],
    "culture": [...],
    "recent_news": [...],
    "role_insights": [...],
    "employee_feedback": [...],
    "industry_context": [...]
  },
  "quality_metrics": {
    "research_depth_score": 0.95,
    "company_alignment_score": 0.92,
    "authenticity_score": 0.89,
    "completion_percentage": 100
  }
}
```

---

## ⚙️ Node Configuration Details

### **1. Webhook Trigger**
- **Path**: `/cv-improvement`
- **Method**: POST
- **Authentication**: Optional (add API key if needed)
- **Response Mode**: "On Received"

### **2. Company Name Extraction (OpenAI)**
- **Model**: GPT-4
- **Temperature**: 0.1 (for consistency)
- **Max Tokens**: 500
- **System Message**: Company extraction specialist

### **3. Research Nodes (Exa Search)**
All research nodes use similar configuration:
- **API Endpoint**: Exa Search API
- **Results**: 5 per query
- **Autoprompt**: Enabled
- **Date Filters**: Recent results preferred

### **4. Data Processing (Code Nodes)**
- **Language**: JavaScript
- **Error Handling**: Try-catch blocks
- **Fallbacks**: Default values for missing data

### **5. Final Storage (Supabase)**
- **Method**: POST
- **Table**: `cv_improvements`
- **Headers**: Content-Type, Prefer return
- **Error Handling**: Retry on failure

---

## 🗄️ Required Supabase Database Schema

```sql
-- Main table for storing CV improvement results
CREATE TABLE cv_improvements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id varchar NOT NULL,
  session_id varchar UNIQUE NOT NULL,
  company_name varchar NOT NULL,
  cv_improvements jsonb NOT NULL,
  cover_letter jsonb NOT NULL,
  company_research jsonb NOT NULL,
  quality_metrics jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_cv_improvements_user_id ON cv_improvements(user_id);
CREATE INDEX idx_cv_improvements_session_id ON cv_improvements(session_id);
CREATE INDEX idx_cv_improvements_created_at ON cv_improvements(created_at);

-- Optional: Company research cache table
CREATE TABLE company_research_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name varchar UNIQUE NOT NULL,
  research_data jsonb NOT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_company_cache_name ON company_research_cache(company_name);
CREATE INDEX idx_company_cache_expires ON company_research_cache(expires_at);
```

---

## 🧪 Testing the Workflow

### **Test Data Example**
```json
{
  "job_description": "We are looking for a Senior Software Engineer to join our engineering team at TechCorp Inc. You will be responsible for developing scalable web applications using React, Node.js, and AWS. We value innovation, collaboration, and continuous learning.",
  "cv_content": "John Doe - Software Engineer with 5 years experience in JavaScript, React, and backend development. Previously worked at StartupXYZ building web applications.",
  "user_id": "test-user-123",
  "session_id": "test-session-456"
}
```

### **Testing Steps**
1. **Manual Test**: Use N8n's "Execute Workflow" with test data
2. **Webhook Test**: Send POST request to webhook URL
3. **Verify Output**: Check all research streams return data
4. **Database Check**: Confirm data saved to Supabase
5. **Error Testing**: Test with invalid company names

---

## 🔧 Troubleshooting

### **Common Issues**

#### **OpenAI Timeout**
- Increase timeout in OpenAI nodes
- Reduce token limits if needed
- Add retry logic

#### **Exa Search Rate Limits**
- Add delay between requests
- Implement exponential backoff
- Cache company research results

#### **Supabase Connection Issues**
- Verify API key and URL
- Check database permissions
- Ensure table exists

#### **JSON Parsing Errors**
- Add validation in code nodes
- Implement fallback values
- Log errors for debugging

### **Performance Optimization**

#### **Parallel Processing**
- All 6 research streams run simultaneously
- Total processing time: 30-60 seconds
- Implement timeout protection

#### **Caching Strategy**
```javascript
// Example caching logic
const cacheKey = `company_${sanitize(companyName)}`;
const cachedData = await checkCache(cacheKey);

if (cachedData && !isExpired(cachedData)) {
  return cachedData;
} else {
  const freshData = await fetchNewData();
  await saveCache(cacheKey, freshData, '24h');
  return freshData;
}

---

## 📊 Monitoring & Analytics

### **Key Metrics to Track**
- Workflow execution time
- Success/failure rates per node
- API usage and costs
- User satisfaction scores
- Company extraction accuracy

### **Logging Setup**
Enable detailed logging for:
- Company name extraction results
- Research query success rates
- AI generation quality scores
- Database save operations

### **Alerts & Notifications**
Set up alerts for:
- Workflow failures
- API rate limit hits
- Unusual processing times
- Database connection issues

---

## 🚀 Deployment Checklist

### **Pre-Deployment**
- [ ] All credentials configured
- [ ] Database schema created
- [ ] Test workflow with sample data
- [ ] Verify all API integrations
- [ ] Check error handling

### **Production Setup**
- [ ] Enable workflow in N8n
- [ ] Set up monitoring
- [ ] Configure backup procedures
- [ ] Document operational procedures
- [ ] Train support team

### **Post-Deployment**
- [ ] Monitor initial usage
- [ ] Collect user feedback
- [ ] Optimize based on performance data
- [ ] Scale infrastructure as needed

---

## 📈 Scaling Considerations

### **High Volume Usage**
- Implement queue system for batch processing
- Add load balancing for multiple N8n instances
- Consider dedicated research result caching
- Optimize database queries and indexes

### **Cost Management**
- Monitor API usage costs (OpenAI, Exa)
- Implement usage limits per user
- Cache research results aggressively
- Optimize AI prompts for efficiency

---

**Ready to Import**: The JSON workflow file is complete and ready for immediate import into your N8n instance!
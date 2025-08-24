# CV Improv - AI-Powered CV Optimization Platform

A comprehensive web application that helps users optimize their CVs using AI analysis, track job applications, and improve their chances of landing interviews.

## Features

### 🔐 Authentication & Plan Management
- JWT-based authentication with refresh tokens
- Freemium (max 3 CVs) and Paid (unlimited) plans
- Secure password hashing and validation
- Email verification and password reset

### 📄 CV & Job Input
- File upload for PDF and DOCX CVs
- Job description input via text or URL scraping
- Automatic parsing and text extraction
- Template-based CV generation

### 🤖 AI Analysis & Optimization
- OpenAI-powered CV optimization
- Compatibility scoring between CV and job descriptions
- Skill gap analysis and certification suggestions
- ATS-friendly keyword optimization

### 📊 Kanban Board
- Application tracking with drag-and-drop interface
- Status management (Applied, Interviewing, Offer, Rejected)
- Application analytics and insights

### 📋 PDF Generation
- Professional PDF CV generation
- Multiple template options
- ATS-optimized layouts

## Tech Stack

### Backend
- **Node.js & Express** - Server framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **OpenAI API** - AI-powered analysis
- **PDFKit** - PDF generation
- **Multer** - File upload handling

### Frontend (To be implemented)
- **React & Next.js** - Frontend framework
- **Tailwind CSS** - Styling
- **React Query** - State management
- **React Hook Form** - Form handling

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cv-improv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database and user
   createdb cv_improv
   
   # Run database setup script
   npm run setup:db
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/cv_improv

# JWT
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### CVs (Coming in next task)
- `GET /api/cvs` - List user's CVs
- `POST /api/cvs` - Create new CV
- `GET /api/cvs/:id` - Get CV details
- `PUT /api/cvs/:id` - Update CV
- `DELETE /api/cvs/:id` - Delete CV

### Jobs (Coming in next task)
- `POST /api/jobs` - Create job description
- `POST /api/scrape-job` - Scrape job from URL

### Analysis (Coming in next task)
- `POST /api/analyze` - Analyze CV against job description

### Applications (Coming in next task)
- `GET /api/applications` - Get Kanban board data
- `POST /api/applications` - Create application
- `PUT /api/applications/:id` - Update application status

## Database Schema

The application uses the following main entities:

- **users** - User accounts with plan information
- **cvs** - CV documents with original and optimized text
- **jobs** - Job descriptions and requirements
- **applications** - Job application tracking
- **templates** - CV templates
- **shares** - Shareable CV links
- **audit_logs** - System audit trail

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migration
```bash
npm run setup:db
```

## Security Features

- JWT token authentication with refresh token rotation
- Password hashing using bcryptjs
- Rate limiting on authentication endpoints
- Input validation and sanitization
- CORS protection
- SQL injection prevention
- XSS protection with Helmet

## Plan Limits

### Freemium Plan
- Maximum 3 CV uploads
- Basic AI analysis
- PDF export
- Standard templates

### Paid Plan
- Unlimited CV uploads
- Advanced AI analysis
- PDF and DOCX export
- Premium templates
- Kanban board
- Analytics dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please create an issue in the GitHub repository or contact the development team.

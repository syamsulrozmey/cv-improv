# Project Requirements Document for `cv-improv`

## 1. Project Overview

`cv-improv` is a web-based application designed to help professionals and students create, edit, and enhance their resumes (CVs) quickly and effectively. It combines a library of polished templates with a WYSIWYG editor and AI-driven content suggestions. Users start with a blank slate or import an existing CV, customize the layout, and receive real-time feedback to improve style, grammar, and impact.

The core purpose of `cv-improv` is to streamline the CV building process and boost user confidence by offering expert-level phrasing recommendations and design consistency. Success will be measured by user satisfaction ratings, number of CVs generated or improved, and repeat usage. Key objectives include fast template selection, seamless editing, and accurate AI suggestions that align with professional standards.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1.0)
- A library of 10–15 responsive CV templates covering entry-level, mid-career, and executive formats.
- WYSIWYG editor with drag-and-drop section reordering.
- Real-time AI-powered content enhancement for phrasing, grammar, and impact using an NLP model.
- Section management: add/remove standard segments (Education, Experience, Skills, Projects).
- Import existing CVs from DOCX and PDF (text-only) and basic parsing to prefill fields.
- Export final CV to PDF and DOCX.
- User authentication (email/password) and profile dashboard to manage saved CVs.
- Basic collaboration: share a CV view-only link via email.

### Out-of-Scope (Later Phases)
- Full two-way integration with LinkedIn or other social networks.
- Advanced version control with branching and merge conflict resolution.
- Mobile-first native apps (iOS/Android).
- Custom plugin or API for applicant tracking systems (ATS).
- Multi-language support beyond English.
- Payment gateway or subscription plans.

## 3. User Flow

A new user lands on the homepage and clicks “Get Started.” They sign up with an email and password (or log in if they already have an account). After logging in, they are redirected to their dashboard, where they can see previously saved CVs or choose “Create New CV.” From here, they select a template that fits their style and industry. The chosen template opens in the WYSIWYG editor.

Inside the editor, users can click on predefined sections (e.g., Work Experience) to add text, reorder sections via drag-and-drop, or customize fonts and colors. As they type, an AI sidebar suggests stronger action verbs, corrects grammatical errors, and quantifies results where possible. When finished, users click “Export,” choose PDF or DOCX, and download the file. They can also share a view-only link with peers for feedback.

## 4. Core Features

- **Template Library**: 10–15 professional, responsive CV templates with color and typography customization.
- **WYSIWYG Editor**: Drag-and-drop interface for text editing, section reordering, inline formatting (bold, italics, lists).
- **AI-Powered Content Enhancer**: Real-time suggestions for grammar, phrasing, action verbs, and metric inclusion using an NLP model.
- **Section Manager**: Add, remove, or rename sections (Education, Experience, Skills, Certifications) with validation rules.
- **Import/Parse**: Upload DOCX/PDF, parse text into structured fields, and populate the editor automatically.
- **Export**: Download final CV as PDF and DOCX with preserved layout and styling.
- **User Authentication & Profile**: Sign-up/log-in, password reset, and a dashboard listing all saved CV projects.
- **Basic Collaboration**: Generate secure, view-only shareable links for feedback.

## 5. Tech Stack & Tools

- **Frontend**: Next.js (React) for server-side rendering, Tailwind CSS for styling.
- **Backend**: Node.js with Express for API endpoints.
- **Database**: PostgreSQL for user profiles and CV data.
- **AI/ML**: OpenAI GPT-4 (or GPT-4o) via API for content suggestions.
- **File Parsing**: `unoconv` or `pdf2text` for PDF parsing; `mammoth.js` for DOCX.
- **Authentication**: NextAuth.js or Auth0 for email/password flows.
- **Deployment**: Vercel for frontend, Heroku or AWS Elastic Beanstalk for backend.
- **IDE/Extensions**: VS Code with ESLint, Prettier, and Windsurf plugin for code completions.

## 6. Non-Functional Requirements

- **Performance**: Page loads under 2 seconds on 4G network; editor interactions under 100ms latency.
- **Scalability**: Support up to 10,000 concurrent users; database connection pooling.
- **Security**: HTTPS everywhere, encrypted at-rest DB fields for user data, OWASP Top 10 compliance.
- **Usability**: Intuitive editor and clear AI suggestions; accessible color contrast and keyboard navigation.
- **Availability**: 99.9% uptime with autoscaling and health checks.

## 7. Constraints & Assumptions

- Assumes stable access to the OpenAI API (GPT-4) with sufficient rate limits.
- Users have modern browsers (Chrome, Firefox, Safari) supporting ES6 and CSS Grid/Flexbox.
- Basic import functionality handles only text-based PDFs and DOCX; no complex layouts or images.
- No payment gateway required for initial launch; all features free to use.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: OpenAI quotas may throttle real-time suggestions. Mitigation: batch calls or cache frequent prompts.
- **Parsing Accuracy**: Imported PDFs with tables or images may not map cleanly into sections. Mitigation: provide manual override to adjust parsed fields.
- **Cross-Browser Styling**: Template rendering might differ slightly. Mitigation: extensive QA on major browsers and use Tailwind’s normalized styles.
- **Security Vulnerabilities**: File upload endpoints could be abused. Mitigation: validate file type and size, sandbox parsing service.

---

This PRD serves as the main guide for the AI model and future documentation. It covers the what, why, and how of `cv-improv` so subsequent technical specs can be built without missing information.
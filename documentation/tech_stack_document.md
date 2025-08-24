# Tech Stack Document for CV-Improv

This document explains, in everyday language, the technology choices behind CV-Improv. It shows how each piece fits together to create a fast, reliable, and user-friendly resume builder with AI-driven suggestions.

---

## 1. Frontend Technologies

Our frontend is what the user sees and interacts with in their web browser. These tools make the interface responsive, editable in real time, and styled consistently.

- **React & Next.js**
  - React provides the building blocks (“components”) for all page elements.
  - Next.js adds server-side rendering and fast page loads, improving performance and SEO.
  - Together, they let us deliver pages quickly and handle routing (moving between pages) with smooth transitions.

- **Tailwind CSS**
  - A utility-first styling framework that speeds up design by offering ready-made classes for colors, spacing, typography, and layouts.
  - Ensures a consistent look across templates while letting us customize colors and fonts easily.

- **WYSIWYG Editor Libraries**
  - Core editor built with React-draggable and contenteditable techniques.
  - Inline formatting (bold, italics, lists) and drag-and-drop section reordering are implemented with small utility libraries to keep the experience snappy.

- **NextAuth.js (or Auth0)**
  - Manages user sign-up, sign-in, password resets, and sessions on the front end.
  - Simplifies secure authentication flows without reinventing the wheel.

- **Developer Tools**
  - **ESLint** and **Prettier** enforce consistent code style and catch errors early.
  - VS Code with helpful extensions (e.g., Windsurf) speeds up development with code completion snippets.

---

## 2. Backend Technologies

The backend powers all data handling, from saving user profiles to running AI suggestions and parsing uploaded files.

- **Node.js & Express**
  - Node.js lets us write server code in JavaScript, the same language used on the frontend.
  - Express provides a lightweight framework for setting up API endpoints (e.g., `POST /api/cv`, `GET /api/suggestions`).

- **PostgreSQL**
  - A robust relational database to store user accounts, CV projects, templates, and version history.
  - Connection pooling ensures the database stays responsive even under load.

- **File Parsing Tools**
  - **Mammoth.js** for converting DOCX files into structured text fields.
  - **pdf2text** (or **unoconv**) to extract text from simple PDFs.
  - After parsing, the backend sends the structured data back to the editor for review.

- **OpenAI GPT-4 API**
  - Powers the AI-driven content enhancer.
  - Our server sends user text snippets to the API and returns phrasing, grammar, and style suggestions in real time.

- **Email Service (e.g., SendGrid or NodeMailer)**
  - Sends password-reset links and share-by-email invitations.

- **Authentication & Authorization**
  - NextAuth.js (or Auth0) hooks into Express to verify sessions.
  - Ensures only the CV owner (or invited reviewers) can access a project.

---

## 3. Infrastructure and Deployment

These choices ensure the app stays reliable, scales with users, and is easy to update.

- **Version Control: Git & GitHub**
  - All code lives in a GitHub repository.
  - Branch protection and pull requests help maintain code quality.

- **CI/CD Pipeline: GitHub Actions**
  - On each push or pull request, we run linting, unit tests, and build steps automatically.
  - Successfully passing builds can trigger deployments.

- **Hosting Platforms**
  - **Frontend on Vercel**: Auto-deploys on every merged change, provides global CDN, and handles server-side rendering for Next.js pages.
  - **Backend on Heroku (or AWS Elastic Beanstalk)**: Easy scaling and managed infrastructure for Node.js and PostgreSQL add-ons.

- **File Storage: AWS S3 (optional)**
  - Stores exported PDF/DOCX files and any user-uploaded assets securely.
  - S3 links integrate with our API for downloads.

- **Monitoring & Logging**
  - Use platform logs (Heroku) and simple APM tools (e.g., New Relic Lite) to track performance metrics and errors.

---

## 4. Third-Party Integrations

We enhance functionality by tapping into reliable external services.

- **OpenAI GPT-4**
  - Real-time suggestions for improving CV content.

- **Mammoth.js & pdf2text/unoconv**
  - Handle document imports so users can start with existing PDFs or Word files.

- **Auth0 or NextAuth.js providers**
  - Manage social logins (future), email flows, and secure sessions.

- **SendGrid (or similar)**
  - Email delivery for password reset and shareable CV links.

- **Google Analytics (or another analytics tool)**
  - Track user behavior, template popularity, and drop-off points to guide improvements.

---

## 5. Security and Performance Considerations

We’ve built in measures to keep user data safe and the app fast.

- **HTTPS Everywhere**
  - All traffic is encrypted with SSL/TLS.

- **Authentication Best Practices**
  - Passwords hashed using a strong algorithm (bcrypt) and never stored in plain text.
  - JSON Web Tokens (JWTs) or secure session cookies manage user identity.

- **Input Validation & Sanitization**
  - File uploads are checked for type and size limits.
  - User text is sanitized to prevent cross-site scripting (XSS).

- **Rate Limiting & Caching**
  - Limit how often the AI endpoint can be called per user to handle OpenAI rate limits.
  - Cache common AI prompts or template assets to reduce load times.

- **Database Security**
  - Encrypted connections to PostgreSQL.
  - Sensitive fields (like email) stored encrypted at rest.

- **Performance Optimization**
  - Next.js server-side rendering for fast initial loads.
  - Code splitting and lazy loading for editor components.
  - Tailwind’s small CSS footprint and PurgeCSS remove unused styles in production.

---

## 6. Conclusion and Overall Tech Stack Summary

CV-Improv brings together a modern, tried-and-tested collection of technologies to achieve our goals:

- **Frontend:** React + Next.js for a responsive, SEO-friendly interface; Tailwind CSS for fast, consistent styling.
- **Backend:** Node.js + Express with PostgreSQL for reliable data storage and robust API endpoints.
- **AI & Parsing:** OpenAI GPT-4 for smart suggestions; Mammoth.js and pdf2text for seamless document imports.
- **Security & Performance:** SSL everywhere, input validation, caching, and server-side rendering for speed and safety.
- **Deployment & DevOps:** GitHub + GitHub Actions for version control and CI/CD; Vercel and Heroku (or AWS EB) for scalable hosting.

These choices align with our goals of a smooth user experience, fast development velocity, and the ability to grow the platform over time. By leveraging managed services and proven libraries, we keep maintenance low while delivering a powerful resume-building tool.

**Ready to build great CVs, faster and smarter.**
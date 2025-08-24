# Backend Structure Document

This document outlines the complete backend setup for CV-Improv. It explains how the code is organized, where data lives, how the system talks to the frontend, and how it all runs safely and smoothly in the cloud.

## 1. Backend Architecture

### Overall Design
- We use **Node.js** with the **Express** framework to build a simple, modular server.
- The code is organized in layers:
  - **Routes** handle incoming web requests (for example, “create a CV” or “get user info”).
  - **Controllers** receive those requests and call the right service.
  - **Services** contain the business logic (for example, “talk to the AI API” or “save a CV draft”).
  - **Data Access Layer** interacts directly with the database.
- This “layered” approach keeps code easy to read, update, and test.

### Support for Scalability, Maintainability, and Performance
- **Stateless Servers**: Each request contains everything the server needs (via tokens and data payloads). We can add more server instances behind a load balancer as traffic grows.
- **Connection Pooling**: Database connections are reused, reducing the overhead of opening new connections on every request.
- **Caching**: Frequently used data (like template files or AI suggestions) is cached to avoid repeated work.
- **Clear Module Boundaries**: By separating routes, controllers, services, and data code, teams can work on features independently without stepping on each other’s toes.

## 2. Database Management

### Technology Choice
- We use **PostgreSQL**, a proven relational (SQL) database, to store all user profiles, CV data, templates, share links, and audit logs.
- Connection is managed through a pool for efficient reuse.

### Data Structure and Access
- Data is organized into tables that relate to each other (for example, a user can have many CVs, and each CV has many sections).
- We use parameterized queries or a lightweight query builder to prevent injection attacks.
- Backups run daily, and we keep transaction logs for quick point-in-time recovery.

## 3. Database Schema

Below is a simplified overview of the main tables and their key columns. Field types and relationships are written in SQL (PostgreSQL dialect) for clarity.

```sql
-- 1. Users table holds the account details
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CVs table stores each resume project
CREATE TABLE cvs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  template_id INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Templates table lists available CV designs
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Shares table manages view-only links
CREATE TABLE shares (
  id SERIAL PRIMARY KEY,
  cv_id INTEGER REFERENCES cvs(id) ON DELETE CASCADE,
  token UUID UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audit logs table captures key events
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. API Design and Endpoints

We follow a **RESTful** approach, where each resource (users, CVs, templates) has standard HTTP endpoints. Below are the key routes:

- **Authentication**
  - POST `/api/auth/signup` → Create a new user account
  - POST `/api/auth/login`  → Log in and receive a session token
  - POST `/api/auth/logout` → Invalidate the current session

- **User Profile**
  - GET `/api/users/me`       → Fetch current user profile
  - PUT `/api/users/me`       → Update name or email
  - POST `/api/users/me/password` → Change password

- **CV Management**
  - GET `/api/cvs`           → List all CVs for the user
  - POST `/api/cvs`          → Create a new CV (with chosen template)
  - GET `/api/cvs/:id`       → Fetch one CV’s data
  - PUT `/api/cvs/:id`       → Update CV content
  - DELETE `/api/cvs/:id`    → Remove a CV
  - POST `/api/cvs/:id/export` → Generate PDF or DOCX for download

- **Template Library**
  - GET `/api/templates`     → List available CV templates

- **AI Content Suggestions**
  - POST `/api/suggestions`  → Send a text snippet and get phrasing/grammar improvements

- **File Import**
  - POST `/api/import`       → Upload a DOCX or PDF for parsing into CV fields

- **Collaboration / Sharing**
  - POST `/api/cvs/:id/share` → Create a view-only share link
  - DELETE `/api/shares/:token` → Revoke a share link

## 5. Hosting Solutions

- **Backend on Heroku or AWS Elastic Beanstalk**
  - Managed platform handles server provisioning, scaling, and OS updates automatically.
  - Easy to configure environment variables, add-ons (PostgreSQL), and logging.
- **Why This Choice?**
  - **Reliability**: Heroku and AWS maintain infrastructure health checks and restarts.
  - **Scalability**: We can increase the number of server instances with a slider or CLI command.
  - **Cost-Effective**: Pay-as-you-go pricing keeps costs low for small-scale usage.

## 6. Infrastructure Components

- **Load Balancer**: Built into Heroku/AWS. Distributes incoming traffic across multiple server instances.
- **Caching Layer**: Optional **Redis** add-on for:
  - Speeding up repeated AI suggestion calls
  - Storing session data if using server-side sessions
- **Content Delivery Network (CDN)**: 
  - Provided by frontend host (Vercel) for static assets (CSS, JavaScript, image previews).
  - Speeds up downloads for users around the world.
- **Object Storage**: **AWS S3** (optional) for storing exported CV files and user-uploaded assets securely.

## 7. Security Measures

- **Authentication & Authorization**
  - JSON Web Tokens (JWT) or secure cookies via NextAuth.js/Auth0.
  - Role checks ensure only owners or invited guests can view a CV.
- **Encryption**
  - HTTPS (SSL/TLS) for all web and API traffic.
  - Passwords hashed with **bcrypt** before storage.
  - Database connections use SSL; sensitive fields (email) encrypted at rest.
- **Input Validation & Sanitization**
  - Strict file type and size checks on uploads.
  - User text is sanitized to prevent cross-site scripting (XSS).
- **Rate Limiting**
  - Limit how often a user can call the AI endpoint to protect against abuse and stay within OpenAI quotas.
- **Compliance**
  - Follows OWASP Top 10 best practices to minimize common web vulnerabilities.

## 8. Monitoring and Maintenance

- **Logging**
  - Application logs (errors, warnings) sent to Heroku Logs or AWS CloudWatch.
  - Audit logs stored in the database for key user actions (CV creation, share events).
- **Performance Monitoring**
  - Lightweight APM tool (New Relic Lite or Heroku Metrics) tracks response times and error rates.
- **Health Checks**
  - A simple `/health` endpoint returns status 200 if the app is running and the database is reachable.
- **Maintenance Strategies**
  - Regular dependency updates via automated tools (Dependabot).
  - Daily database backups and weekly restore drills.
  - Automated CI/CD pipeline (GitHub Actions) runs tests and linting on every pull request before deploying.

## 9. Conclusion and Overall Backend Summary

CV-Improv’s backend is a straightforward, layered Node.js & Express server backed by PostgreSQL. It talks to the frontend through clear REST endpoints, handles AI suggestions, file parsing, and secure user sessions. Everything runs on a managed cloud platform with built-in load balancing, caching, and CDN support. Security best practices—like SSL, input validation, rate limiting, and encrypted passwords—keep user data safe. Monitoring, logging, and automated backups ensure the system remains reliable and up-to-date. Altogether, this structure delivers a solid, scalable foundation for a fast, dependable, and user-friendly resume-building experience.
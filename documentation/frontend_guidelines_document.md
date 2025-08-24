# Frontend Guideline Document for CV-Improv

This document explains how the frontend of CV-Improv is built and maintained. It covers the architecture, design principles, styling, component structure, state management, routing, performance, testing, and a final summary. By following these guidelines, anyone—technical or not—can understand how the app works in the browser.

## 1. Frontend Architecture

1. **Frameworks and Libraries**
   - **Next.js (React)**: Provides server-side rendering (SSR) for fast initial page loads and search-engine friendliness. It also handles file-based routing out of the box.
   - **React**: Powers individual UI parts (components) that can be reused across pages.
   - **NextAuth.js**: Manages user sessions (sign-up, sign-in, password resets) in a secure way without custom authentication code.
   - **Tailwind CSS**: A utility-first styling tool that speeds up design with ready-made classes.

2. **How It Supports Scalability, Maintainability & Performance**
   - **Scalability**: Pages and components live in separate folders. New features get their own directory, reducing naming conflicts.
   - **Maintainability**: Clear folder structure (`pages/`, `components/`, `styles/`) and naming conventions make it easy to find or swap out code.
   - **Performance**: SSR and static generation (SSG) via Next.js ensure fast first loads. Tailwind’s PurgeCSS removes unused styles in production, keeping CSS files small.

## 2. Design Principles

1. **Usability**
   - Clear labels and buttons (e.g., “Create New CV,” “Export to PDF”).
   - Consistent layout: primary actions are always in the top-right or center.

2. **Accessibility**
   - Keyboard navigation support (tab order, focus outlines).
   - ARIA attributes on interactive elements (buttons, modals).
   - Color contrast meets WCAG AA standards.

3. **Responsiveness**
   - Mobile-first breakpoints in Tailwind (sm, md, lg, xl).
   - Flexible grid and flexbox layouts adjust to any screen.

4. **Consistency**
   - A single design system: shared colors, fonts, and spacing scales.
   - Reusable UI components (buttons, inputs, cards) behave the same across pages.

## 3. Styling and Theming

1. **Styling Approach**
   - **Tailwind CSS** (utility-first): write classes like `px-4 py-2 bg-indigo-600 text-white rounded` instead of custom CSS.
   - Minimal custom CSS in `styles/globals.css` for base resets and shared variables.

2. **Theming**
   - Light theme only (v1.0) with CSS custom properties for easy adjustments.
   - Future support for dark mode via Tailwind’s `dark:` variant.

3. **Visual Style**
   - Modern, clean, flat design with subtle glassmorphism on modals and side panels (slightly transparent backgrounds with a soft blur).

4. **Color Palette**
   - Primary: Indigo #4F46E5
   - Secondary: Emerald #10B981
   - Neutral Light: Gray #F3F4F6
   - Neutral Dark (text): #1F2937
   - Error/Alert: Red #EF4444

5. **Typography**
   - Font Family: **Inter** (available via Google Fonts)
   - Headings: 600 weight
   - Body text: 400 weight
   - Line height: 1.5 for readability

## 4. Component Structure

1. **Folder Organization**
   - `/pages`: top-level pages with file-based routing (e.g., `dashboard.js`, `cv/[id].js`).
   - `/components`: reusable pieces organized by feature:
     - `common/`: buttons, inputs, modals
     - `layout/`: Header, Footer, Sidebar
     - `editor/`: WYSIWYG controls, section blocks
     - `templates/`: template thumbnails and previews

2. **Atomic Design**
   - **Atoms**: smallest UI elements (Button, Input).
   - **Molecules**: combinations (FormField combines Label + Input + ErrorText).
   - **Organisms**: larger sections (CVEditorPanel, TemplateGrid).

3. **Reusability and Maintainability**
   - Each component has its own folder with `index.tsx`, `styles.module.css` if needed, and tests.
   - Props are well-typed (using TypeScript) and documented.

## 5. State Management

1. **Server State**
   - **React Query** (or SWR) handles data fetching, caching, and synchronization with the backend API.
   - Queries for CV lists, template metadata, AI suggestions, etc.

2. **Global UI State**
   - **React Context** for session information (via NextAuth) and theme settings.
   - Light use of Context + `useReducer` for editor-specific UI states (open modals, current section drag status).

3. **Local Component State**
   - Individual editors and form fields use `useState` for transient UI interactions (typing, focus).

## 6. Routing and Navigation

1. **File-Based Routing (Next.js)**
   - `/` → Landing page
   - `/auth/signin` & `/auth/signup` → Authentication pages
   - `/dashboard` → User’s CV list
   - `/cv/[id]` → CV editor
   - `/import` → Import existing CV

2. **Protected Routes**
   - NextAuth’s `getSession` in `getServerSideProps` blocks access to `/dashboard` and `/cv/*` unless signed in.

3. **Linking and Navigation**
   - Use Next.js `<Link>` for client-side transitions.
   - Active link styles in the sidebar (`bg-indigo-50 border-indigo-500`).

## 7. Performance Optimization

1. **Server-Side Rendering & Static Generation**
   - Pages like `/dashboard` and `/cv/[id]` use SSR to fetch fresh data on each request.
   - Marketing pages (landing, about) use SSG for superfast loads.

2. **Code Splitting & Lazy Loading**
   - Dynamic imports for heavy components (editor, template previews) via `next/dynamic`.
   - Split vendor code automatically with Next.js.

3. **Asset Optimization**
   - Next/Image for optimized image sizes and formats (WebP fallback).
   - Tailwind’s PurgeCSS removes unused CSS in production.

4. **Caching & Throttling**
   - React Query caches API results.
   - Rate limit AI calls (OpenAI) on the client side to stay within quotas.

## 8. Testing and Quality Assurance

1. **Unit Tests**
   - **Jest** + **React Testing Library** for individual component logic and rendering tests.

2. **Integration Tests**
   - Combine components (e.g., form + validation) to ensure they work together.

3. **End-to-End Tests**
   - **Cypress** tests simulate user flows (sign-up, create CV, export).

4. **Visual Regression**
   - **Storybook** with Chromatic or Loki to catch UI changes in shared components.

5. **Linting & Formatting**
   - **ESLint** (with a shared config) and **Prettier** enforce code style.
   - **Husky + lint-staged** run linting and tests on pre-commit.

## 9. Conclusion and Overall Frontend Summary

The CV-Improv frontend combines Next.js, React, Tailwind CSS, and NextAuth to deliver a fast, maintainable, and user-friendly experience. Our design principles—usability, accessibility, and responsiveness—guide every UI decision. Components are organized by feature and sized by atomic design, making them easy to find and reuse. Data is fetched and cached with React Query, and Next.js handles routing, SSR, and code splitting for performance. Finally, thorough testing (unit, integration, E2E, visual) and linting ensure we ship reliable code. 

By following these guidelines, anyone working on CV-Improv will build a consistent, scalable, and high-quality application that helps users create outstanding resumes.
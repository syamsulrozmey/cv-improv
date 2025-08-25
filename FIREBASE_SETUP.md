# Firebase Backend Setup Guide

This guide will walk you through setting up Firebase as your backend for the CV Improv application.

## 🔥 Prerequisites

1. **Node.js** (v16 or higher)
2. **Firebase CLI** - Install with: `npm install -g firebase-tools`
3. **Google account** for Firebase Console access

## 📋 Step 1: Create Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Create Project**:
   - Click "Create a project"
   - Project name: `cv-improv` (or your preferred name)
   - Enable Google Analytics (optional but recommended)
   - Choose or create Google Analytics account

## 🔐 Step 2: Enable Authentication

1. **Navigate to Authentication** in Firebase Console
2. **Get Started** → **Sign-in method**
3. **Enable Email/Password**:
   - Click "Email/Password" provider
   - Enable "Email/Password" toggle
   - Save
4. **Enable Google Sign-In** (optional):
   - Click "Google" provider
   - Enable toggle
   - Select your project's support email
   - Save

## 🗄️ Step 3: Set Up Firestore Database

1. **Navigate to Firestore Database**
2. **Create Database**:
   - Choose "Start in test mode" for now
   - Select your preferred region (choose closest to your users)
3. **Rules will be updated later** with our security rules

## 📁 Step 4: Set Up Firebase Storage

1. **Navigate to Storage**
2. **Get Started**:
   - Start in test mode
   - Choose same region as Firestore
3. **Rules will be updated later** with our security rules

## ⚙️ Step 5: Get Configuration Keys

1. **Go to Project Settings** (gear icon)
2. **Scroll to "Your apps" section**
3. **Add Web App**:
   - Click web icon `</>`
   - App nickname: `cv-improv-web`
   - Enable Firebase Hosting (optional)
   - Register app
4. **Copy configuration object**

## 🔧 Step 6: Configure Environment Variables

1. **Create `.env` file** in your `client/` directory:

```bash
# Navigate to client directory
cd client

# Copy the example environment file
cp .env.example .env
```

2. **Edit `.env` file** with your Firebase config:

```env
# Firebase Configuration (from Firebase Console)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# OpenAI API Key (for AI analysis)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

## 🔒 Step 7: Deploy Security Rules

1. **Initialize Firebase** in your project root:

```bash
# Login to Firebase (if not already)
firebase login

# Initialize Firebase project
firebase init

# Select the following services:
# - Firestore: Configure Firestore security rules and indexes
# - Storage: Configure Cloud Storage security rules
# - Hosting: Configure files for Firebase Hosting (optional)

# Choose your existing project
# Use existing files (firestore.rules, storage.rules, etc.)
```

2. **Deploy security rules**:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## 🚀 Step 8: Install Dependencies and Start

```bash
# Install client dependencies (if not done)
cd client
npm install

# Start the development server
npm start
```

## 🧪 Step 9: Testing Your Setup

1. **Start your React app**: `npm start`
2. **Open browser**: http://localhost:3000
3. **Test Authentication**:
   - Click "Sign Up" to create an account
   - Verify you can sign in/out
   - Check Firebase Console → Authentication for new users

## 📊 Firebase Console Monitoring

### Authentication Users
- Go to **Authentication → Users** to see registered users
- Monitor sign-in methods and user activity

### Firestore Data
- Go to **Firestore Database → Data** to see your collections:
  - `users` - User profiles and settings
  - `cvs` - Uploaded CV documents
  - `jobs` - Job descriptions
  - `applications` - Job application tracking
  - `analysis` - AI analysis results

### Storage Files
- Go to **Storage → Files** to see uploaded files:
  - `users/{userId}/cvs/` - CV files
  - File metadata and download URLs

## 🔧 Development vs Production

### Development (Test Mode)
- Rules allow more permissive access
- Good for testing and development
- **Security warning**: Don't use in production!

### Production
- Strict security rules (already implemented)
- User can only access their own data
- File type and size validation
- Rate limiting and abuse protection

## 🚨 Security Features Implemented

### Firestore Security
- ✅ User data isolation (users can only access their own data)
- ✅ File type validation for uploads
- ✅ File size limits (10MB for CVs)
- ✅ Text length limits (prevent abuse)
- ✅ Plan-based CV upload limits

### Storage Security
- ✅ User-specific file access
- ✅ File type validation
- ✅ File size limits
- ✅ Secure file organization

### Authentication
- ✅ Email verification
- ✅ Password strength requirements
- ✅ Google OAuth integration
- ✅ Session management with Firebase

## 🔍 Troubleshooting

### Common Issues

1. **"Permission denied" errors**:
   - Check if user is authenticated
   - Verify security rules are deployed
   - Check user ownership of data

2. **Configuration errors**:
   - Verify `.env` file variables
   - Check Firebase project settings
   - Ensure all services are enabled

3. **File upload failures**:
   - Check file size (max 10MB)
   - Verify file type (PDF, DOC, DOCX, TXT)
   - Check Storage security rules

### Debug Tools

1. **Firebase Emulator** (for local testing):
```bash
firebase emulators:start
```

2. **Browser Console** - Check for Firebase errors

3. **Firebase Console** - Monitor real-time activity

## 📈 Next Steps

### Optional Enhancements

1. **Firebase Hosting** - Deploy your app
2. **Firebase Functions** - Add server-side processing
3. **Firebase Analytics** - Track user behavior
4. **Firebase Performance** - Monitor app performance

### Monitoring & Analytics

1. **Set up Firebase Analytics** for user insights
2. **Configure error reporting** with Firebase Crashlytics
3. **Monitor performance** with Firebase Performance

## 💰 Pricing Considerations

### Firebase Free Tier (Spark Plan)
- **Authentication**: 50,000 MAU
- **Firestore**: 50K reads/day, 20K writes/day
- **Storage**: 5GB total, 1GB/day downloads
- **Hosting**: 10GB/month

### Paid Tier (Blaze Plan)
- **Pay as you go** beyond free limits
- **Predictable pricing** for most apps
- **Production-ready** scaling

---

## 🎉 You're All Set!

Your CV Improv application now has a fully functional Firebase backend with:
- 🔐 Secure user authentication
- 🗄️ Scalable database (Firestore)
- 📁 File storage for CV uploads
- 🤖 AI-powered analysis integration
- 📊 Application tracking system

The app is ready for development and can scale to thousands of users!
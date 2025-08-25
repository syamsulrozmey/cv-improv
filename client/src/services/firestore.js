// Firestore database service layer
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CVS: 'cvs',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  TEMPLATES: 'templates',
  ANALYSIS: 'analysis'
};

/**
 * Generic Firestore operations
 */
class FirestoreService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = collection(db, collectionName);
  }

  // Create a new document
  async create(data, customId = null) {
    try {
      const timestamp = serverTimestamp();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (customId) {
        const docRef = doc(this.collection, customId);
        await setDoc(docRef, documentData);
        return { id: customId, ...documentData };
      } else {
        const docRef = await addDoc(this.collection, documentData);
        return { id: docRef.id, ...documentData };
      }
    } catch (error) {
      console.error(`Error creating ${this.collectionName} document:`, error);
      throw error;
    }
  }

  // Get a document by ID
  async getById(id) {
    try {
      const docRef = doc(this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting ${this.collectionName} document:`, error);
      throw error;
    }
  }

  // Update a document
  async update(id, data) {
    try {
      const docRef = doc(this.collection, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error(`Error updating ${this.collectionName} document:`, error);
      throw error;
    }
  }

  // Delete a document
  async delete(id) {
    try {
      const docRef = doc(this.collection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.collectionName} document:`, error);
      throw error;
    }
  }

  // Get documents with query
  async getWithQuery(constraints = []) {
    try {
      const q = query(this.collection, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error querying ${this.collectionName} collection:`, error);
      throw error;
    }
  }
}

/**
 * CV Service
 */
export class CVService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.CVS);
  }

  // Get CVs for a user
  async getUserCVs(userId) {
    return this.getWithQuery([
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    ]);
  }

  // Create a new CV
  async createCV(userId, cvData) {
    const data = {
      userId,
      title: cvData.title || 'Untitled CV',
      originalText: cvData.originalText || '',
      optimizedText: cvData.optimizedText || '',
      status: 'processing', // processing, optimized, error
      templateId: cvData.templateId || 1,
      fileName: cvData.fileName || '',
      fileType: cvData.fileType || '',
      fileSize: cvData.fileSize || 0,
      stats: {
        textLength: cvData.originalText?.length || 0,
        wordCount: cvData.originalText?.split(/\s+/).length || 0,
        processingTime: 0
      },
      metadata: cvData.metadata || {}
    };

    return this.create(data);
  }

  // Update CV with optimization results
  async updateOptimization(cvId, optimizationData) {
    return this.update(cvId, {
      optimizedText: optimizationData.optimizedText,
      status: 'optimized',
      stats: {
        ...optimizationData.stats,
        processingTime: optimizationData.processingTime
      },
      optimization: optimizationData.optimization
    });
  }

  // Check user's CV count
  async getUserCVCount(userId) {
    const cvs = await this.getUserCVs(userId);
    return cvs.length;
  }
}

/**
 * Job Service
 */
export class JobService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.JOBS);
  }

  // Create a new job description
  async createJob(userId, jobData) {
    const data = {
      userId,
      title: jobData.title || '',
      company: jobData.company || '',
      description: jobData.description || '',
      url: jobData.url || '',
      skillsRequired: jobData.skillsRequired || [],
      requirements: jobData.requirements || [],
      benefits: jobData.benefits || [],
      salary: jobData.salary || '',
      location: jobData.location || '',
      type: jobData.type || 'full-time', // full-time, part-time, contract, remote
      source: jobData.source || 'manual', // manual, scraped
      metadata: jobData.metadata || {}
    };

    return this.create(data);
  }

  // Get jobs for a user
  async getUserJobs(userId) {
    return this.getWithQuery([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }
}

/**
 * Application Service
 */
export class ApplicationService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.APPLICATIONS);
  }

  // Create a new application
  async createApplication(userId, applicationData) {
    const data = {
      userId,
      cvId: applicationData.cvId,
      jobId: applicationData.jobId,
      status: 'applied', // applied, interviewing, offer, rejected, withdrawn
      appliedDate: applicationData.appliedDate || serverTimestamp(),
      notes: applicationData.notes || '',
      priority: applicationData.priority || 'medium', // low, medium, high
      followUpDate: applicationData.followUpDate || null,
      interviews: applicationData.interviews || [],
      documents: applicationData.documents || [],
      metadata: applicationData.metadata || {}
    };

    return this.create(data);
  }

  // Get applications for a user
  async getUserApplications(userId) {
    return this.getWithQuery([
      where('userId', '==', userId),
      orderBy('appliedDate', 'desc')
    ]);
  }

  // Update application status
  async updateStatus(applicationId, status, notes = '') {
    return this.update(applicationId, {
      status,
      notes,
      statusUpdatedAt: serverTimestamp()
    });
  }

  // Get applications by status for Kanban board
  async getApplicationsByStatus(userId) {
    const applications = await this.getUserApplications(userId);
    
    const statusGroups = {
      applied: [],
      interviewing: [],
      offer: [],
      rejected: []
    };

    applications.forEach(app => {
      if (statusGroups[app.status]) {
        statusGroups[app.status].push(app);
      }
    });

    return statusGroups;
  }
}

/**
 * Analysis Service
 */
export class AnalysisService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.ANALYSIS);
  }

  // Create a new analysis
  async createAnalysis(userId, analysisData) {
    const data = {
      userId,
      cvId: analysisData.cvId,
      jobId: analysisData.jobId,
      compatibilityScore: analysisData.compatibilityScore || 0,
      atsScore: analysisData.atsScore || 0,
      improvements: analysisData.improvements || [],
      skillsMatch: analysisData.skillsMatch || [],
      skillsGap: analysisData.skillsGap || [],
      keywordAnalysis: analysisData.keywordAnalysis || {},
      suggestions: analysisData.suggestions || [],
      processingTime: analysisData.processingTime || 0,
      metadata: analysisData.metadata || {}
    };

    return this.create(data);
  }

  // Get analysis by CV and Job ID
  async getAnalysis(cvId, jobId) {
    const analyses = await this.getWithQuery([
      where('cvId', '==', cvId),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc'),
      limit(1)
    ]);

    return analyses.length > 0 ? analyses[0] : null;
  }

  // Get user's analysis history
  async getUserAnalyses(userId) {
    return this.getWithQuery([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }
}

// Export service instances
export const cvService = new CVService();
export const jobService = new JobService();
export const applicationService = new ApplicationService();
export const analysisService = new AnalysisService();

// Export generic service class for custom use
export { FirestoreService };
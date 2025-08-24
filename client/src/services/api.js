import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// CV API
export const cvAPI = {
  getCVs: (params = {}) => api.get('/cvs', { params }),
  getCV: (id) => api.get(`/cvs/${id}`),
  createCV: (data) => api.post('/cvs', data),
  uploadCV: (formData) => api.post('/cvs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateCV: (id, data) => api.put(`/cvs/${id}`, data),
  deleteCV: (id) => api.delete(`/cvs/${id}`),
  downloadCV: (id, template = 'professional') => {
    return api.get(`/cvs/${id}/download?template=${template}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
      },
    });
  },
  previewCV: (id, template = 'professional') => {
    return `${api.defaults.baseURL}/cvs/${id}/preview?template=${template}`;
  },
  getTemplates: () => api.get('/cvs/templates/list'),
};

// Job API
export const jobAPI = {
  getJobs: (params = {}) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post('/jobs', data),
  scrapeJob: (data) => api.post('/jobs/scrape', data),
};

// Analysis API
export const analysisAPI = {
  analyzeCV: (data) => api.post('/analysis/analyze', data),
  optimizeCV: (data) => api.post('/analysis/optimize', data),
  getAnalysis: (cvId) => api.get(`/analysis/cv/${cvId}`),
  getSkillGaps: (params) => api.get('/analysis/skill-gaps', { params }),
};

// Application API
export const applicationAPI = {
  getApplications: (params = {}) => api.get('/applications', { params }),
  createApplication: (data) => api.post('/applications', data),
  updateApplication: (id, data) => api.put(`/applications/${id}`, data),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
  getAnalytics: (params = {}) => api.get('/applications/analytics', { params }),
};

export default api;
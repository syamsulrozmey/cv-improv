import React, { useState, useEffect } from 'react';
import { applicationAPI } from '../services/api';

const KanbanBoard = ({ onError }) => {
  const [applications, setApplications] = useState({
    applied: [],
    interviewing: [],
    offer: [],
    rejected: []
  });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const columnConfig = {
    applied: {
      title: 'Applied',
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'bg-blue-500',
      icon: '📝'
    },
    interviewing: {
      title: 'Interviewing',
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'bg-yellow-500',
      icon: '💬'
    },
    offer: {
      title: 'Offer',
      color: 'bg-green-50 border-green-200',
      headerColor: 'bg-green-500',
      icon: '🎉'
    },
    rejected: {
      title: 'Rejected',
      color: 'bg-red-50 border-red-200',
      headerColor: 'bg-red-500',
      icon: '❌'
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await applicationAPI.getApplications();
      setApplications(response.data.data.kanban);
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Load applications error:', error);
      onError?.('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationAPI.updateApplication(applicationId, { status: newStatus });
      
      // Reload applications to get updated data
      await loadApplications();
      
    } catch (error) {
      console.error('Status update error:', error);
      onError?.('Failed to update application status. Please try again.');
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      await applicationAPI.deleteApplication(applicationId);
      await loadApplications();
    } catch (error) {
      console.error('Delete application error:', error);
      onError?.('Failed to delete application. Please try again.');
    }
  };

  const ApplicationCard = ({ application, currentStatus }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">
          {application.job.title || 'Untitled Position'}
        </h4>
        <div className="flex space-x-1">
          <button
            onClick={() => setSelectedApp(application)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ℹ️
          </button>
          <button
            onClick={() => handleDeleteApplication(application.id)}
            className="text-gray-400 hover:text-red-600 text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {application.job.company && (
        <p className="text-sm text-gray-600 mb-2">{application.job.company}</p>
      )}
      
      <p className="text-xs text-gray-500 mb-3">
        CV: {application.cv.title}
      </p>

      {application.notes && (
        <p className="text-xs text-gray-600 mb-3 italic">
          "{application.notes.substring(0, 100)}{application.notes.length > 100 ? '...' : ''}"
        </p>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {new Date(application.applicationDate).toLocaleDateString()}
        </span>
        
        <div className="flex space-x-1">
          {Object.keys(columnConfig).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(application.id, status)}
              disabled={status === currentStatus}
              className={`text-xs px-2 py-1 rounded transition-colors duration-200 ${
                status === currentStatus
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={`Move to ${columnConfig[status].title}`}
            >
              {columnConfig[status].icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading applications...</span>
      </div>
    );
  }

  const totalApplications = Object.values(applications).reduce((sum, apps) => sum + apps.length, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Application Tracker</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary text-sm"
          >
            + Add Application
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.applied || 0}</div>
            <div className="text-sm text-gray-600">Applied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.interviewing || 0}</div>
            <div className="text-sm text-gray-600">Interviewing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.offer || 0}</div>
            <div className="text-sm text-gray-600">Offers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.successRate || 0}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {totalApplications > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(columnConfig).map(([status, config]) => (
            <div key={status} className={`rounded-lg border ${config.color}`}>
              {/* Column Header */}
              <div className={`${config.headerColor} text-white px-4 py-3 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {config.icon} {config.title}
                  </h3>
                  <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded">
                    {applications[status]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 min-h-[400px]">
                {applications[status]?.length > 0 ? (
                  applications[status].map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      currentStatus={status}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm">No applications yet</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Applications Yet</h3>
          <p className="text-gray-600 mb-4">Start tracking your job applications to see your progress!</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            Add Your First Application
          </button>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Position</label>
                  <p className="text-gray-900">{selectedApp.job.title || 'Untitled'}</p>
                </div>

                {selectedApp.job.company && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company</label>
                    <p className="text-gray-900">{selectedApp.job.company}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">CV Used</label>
                  <p className="text-gray-900">{selectedApp.cv.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-gray-900 capitalize">{selectedApp.status}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Application Date</label>
                  <p className="text-gray-900">
                    {new Date(selectedApp.applicationDate).toLocaleDateString()}
                  </p>
                </div>

                {selectedApp.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedApp.notes}</p>
                  </div>
                )}

                {selectedApp.job.url && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Job URL</label>
                    <a
                      href={selectedApp.job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 break-all"
                    >
                      {selectedApp.job.url}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="w-full btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Application Form (placeholder) */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Application</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-600">
                  To add applications, first upload a CV and create job descriptions using the main interface.
                  Then return here to track your applications.
                </p>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="mt-4 btn-primary"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
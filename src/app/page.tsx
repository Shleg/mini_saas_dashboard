'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TeamMember {
  id: number;
  name: string;
}

interface Project {
  id: number;
  status: 'active' | 'on_hold' | 'completed';
  deadline: string;
  budget: number;
  team_member_id: number;
  team_member_name: string;
}

interface ProjectFormData {
  status: 'active' | 'on_hold' | 'completed';
  deadline: string;
  budget: number;
  teamMemberId: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    status: 'active',
    deadline: '',
    budget: 0,
    teamMemberId: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, searchQuery]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
        if (data.length > 0 && formData.teamMemberId === 0) {
          setFormData(prev => ({ ...prev, teamMemberId: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const response = await fetch(`/api/projects?${params.toString()}`, {
        credentials: 'include', // Important: include cookies
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        setError('');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch projects' }));
        setError(errorData.error || 'Failed to fetch projects');
        if (response.status === 401) {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const openModal = (project?: Project) => {
    if (project) {
      setEditingProjectId(project.id);
      // Convert deadline to format for date input (YYYY-MM-DD)
      // Handle different date formats from database
      let formattedDeadline = '';
      if (project.deadline) {
        try {
          // If deadline already contains time (ISO format), extract just the date part
          const dateStr = project.deadline.split('T')[0];
          // Parse as local date to avoid timezone issues
          const [year, month, day] = dateStr.split('-').map(Number);
          const deadlineDate = new Date(year, month - 1, day);
          formattedDeadline = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } catch (err) {
          console.error('Error parsing deadline:', err);
          formattedDeadline = project.deadline.split('T')[0]; // Fallback to just date part
        }
      }
      
      setFormData({
        status: project.status,
        deadline: formattedDeadline,
        budget: project.budget,
        teamMemberId: project.team_member_id,
      });
    } else {
      setEditingProjectId(null);
      setFormData({
        status: 'active',
        deadline: '',
        budget: 0,
        teamMemberId: teamMembers[0]?.id || 0,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProjectId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingProjectId
        ? `/api/projects/${editingProjectId}`
        : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          deadline: formData.deadline,
          budget: formData.budget,
          teamMemberId: formData.teamMemberId,
        }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        closeModal();
        fetchProjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save project');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        fetchProjects();
      } else {
        setError('Failed to delete project');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Extract just the date part (YYYY-MM-DD) if it contains time
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      // Create date in local timezone to avoid shift
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      console.error('Error formatting date:', err, dateString);
      return dateString; // Fallback to original string
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Projects Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by team member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Add Project
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                            project.status
                          )}`}
                        >
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(project.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.team_member_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(project.budget)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal(project);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProjectId ? 'Edit Project' : 'Add Project'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'active' | 'on_hold' | 'completed',
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Team Member
                  </label>
                  <select
                    value={formData.teamMemberId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teamMemberId: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Budget
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

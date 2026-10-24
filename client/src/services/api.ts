const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode = '';
    let errorDetails: any = {};
    try {
      const errorData = await response.json();
      errorDetails = errorData;
      errorMessage = errorData.error || errorMessage;
      errorCode = errorData.code || '';
    } catch (e) {}

    if (
      response.status === 401 ||
      (response.status === 403 && (errorCode === 'ACCOUNT_SUSPENDED' || errorCode === 'ACCOUNT_DELETED'))
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: { message: errorMessage, code: errorCode },
        })
      );
    }

    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.code = errorCode;
    error.details = errorDetails;
    throw error;
  }

  return response.json();
};

export const authApi = {
  login: (data: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  adminLogin: (data: any) => apiFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getAdminLockoutStatus: (email?: string) =>
    apiFetch(`/admin/auth/lockout-status${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  register: (data: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

export const plansApi = {
  getAll: () => apiFetch('/plans'),
  create: (data: any) => apiFetch('/plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/plans/${id}`, { method: 'DELETE' }),
  deactivate: (id: number) => apiFetch(`/plans/${id}/deactivate`, { method: 'PATCH' }),
  activate: (id: number) => apiFetch(`/plans/${id}/activate`, { method: 'PATCH' }),
};

export const announcementsApi = {
  getUnseen: () => apiFetch('/announcements/unseen'),
  markSeen: (id: number) => apiFetch(`/announcements/${id}/seen`, { method: 'POST' }),
};

export const subscriptionsApi = {
  getMe: () => apiFetch('/subscriptions/me'),
  create: (planId: number) => apiFetch('/subscriptions/create', { method: 'POST', body: JSON.stringify({ planId }) }),
  cancel: () => apiFetch('/subscriptions/cancel', { method: 'POST' }),
  purchase: (planId: number) => apiFetch('/subscriptions/purchase', { method: 'POST', body: JSON.stringify({ planId }) }),
  getInvoices: (params?: { page?: number; limit?: number; offset?: number }) => {
    if (!params) return apiFetch('/subscriptions/invoices');
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/subscriptions/invoices${query ? `?${query}` : ''}`);
  },
  sync: () => apiFetch('/subscriptions/sync', { method: 'POST' }),
};

export const datasetsApi = {
  get: (params?: { page?: number; limit?: number; offset?: number; all?: boolean }) => {
    if (!params) return apiFetch('/datasets');
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch(`/datasets${query ? `?${query}` : ''}`);
  },
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },
  delete: (id: number) => apiFetch(`/datasets/${id}`, { method: 'DELETE' }),
};

export const reportsApi = {
  getOverview: (datasetId: number) => apiFetch(`/reports/${datasetId}/overview`),
  getDrilldown: (datasetId: number, params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return apiFetch(`/reports/${datasetId}/drilldown?${searchParams.toString()}`);
  }
};

export const profileApi = {
  get: () => apiFetch('/profile'),
  update: (data: any) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  requestCode: () => apiFetch('/profile/password/request-code', { method: 'POST' }),
  verifyCode: (code: string) => apiFetch('/profile/password/verify-code', { method: 'POST', body: JSON.stringify({ code }) }),
  resetPassword: (data: any) => apiFetch('/profile/password/reset', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccount: (data: any) => apiFetch('/profile', { method: 'DELETE', body: JSON.stringify(data) }),
};

export const feedbacksApi = {
  submit: (data: { subject: string; message: string }) => apiFetch('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
  getMyFeedbacks: () => apiFetch('/feedbacks/my'),
  getAll: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {});
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch(`/feedbacks${query}`);
  },
  updateStatus: (id: number, status: 'pending' | 'sent' | 'replied') => apiFetch(`/feedbacks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  reply: (id: number, replyMessage: string) => apiFetch(`/feedbacks/${id}/reply`, { method: 'POST', body: JSON.stringify({ replyMessage }) }),
  delete: (id: number) => apiFetch(`/feedbacks/${id}`, { method: 'DELETE' }),
};

export const faqsApi = {
  getPublic: () => apiFetch('/faqs'),
  getAllAdmin: () => apiFetch('/admin/faqs'),
  getById: (id: number) => apiFetch(`/admin/faqs/${id}`),
  create: (data: { question: string; answer: string; sortOrder?: number; isVisible?: boolean }) => 
    apiFetch('/admin/faqs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { question?: string; answer?: string; sortOrder?: number; isVisible?: boolean }) => 
    apiFetch(`/admin/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleVisibility: (id: number, isVisible?: boolean) => 
    apiFetch(`/admin/faqs/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ isVisible }) }),
  delete: (id: number) => apiFetch(`/admin/faqs/${id}`, { method: 'DELETE' }),
};

export const adminUsersApi = {
  getAll: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {});
    return apiFetch(`/admin/users?${searchParams.toString()}`);
  },
  getById: (id: number) => apiFetch(`/admin/users/${id}`),
  update: (id: number, data: any) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string, reason?: string) => apiFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  getFeedbacks: (id: number, page: number = 1, limit: number = 20) => apiFetch(`/admin/users/${id}/feedbacks?page=${page}&limit=${limit}`),
};

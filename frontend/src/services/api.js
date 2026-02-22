import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ---- Books ----
export const booksApi = {
  list: (params) => api.get('/books', { params }),
  get: (id) => api.get(`/books/${id}`),
  getByISBN: (isbn) => api.get(`/books/isbn/${isbn}`),
  getCopyByBarcode: (barcode) => api.get(`/books/copy/barcode/${barcode}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  addCopy: (id, data) => api.post(`/books/${id}/copies`, data),
  updateCopy: (copyId, data) => api.put(`/books/copies/${copyId}`, data),
  genres: () => api.get('/books/genres'),
  authors: (params) => api.get('/books/authors', { params }),
};

// ---- Members ----
export const membersApi = {
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  getByBarcode: (barcode) => api.get(`/members/barcode/${barcode}`),
  getLoans: (id, params) => api.get(`/members/${id}/loans`, { params }),
  getFines: (id) => api.get(`/members/${id}/fines`),
  getReservations: (id) => api.get(`/members/${id}/reservations`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  resetPassword: (id, data) => api.put(`/members/${id}/reset-password`, data),
};

// ---- Circulation ----
export const circulationApi = {
  listLoans: (params) => api.get('/circulation/loans', { params }),
  getLoan: (id) => api.get(`/circulation/loan/${id}`),
  getOverdue: () => api.get('/circulation/overdue'),
  checkout: (data) => api.post('/circulation/checkout', data),
  return: (data) => api.post('/circulation/return', data),
  renew: (data) => api.post('/circulation/renew', data),
};

// ---- Reservations ----
export const reservationsApi = {
  list: (params) => api.get('/reservations', { params }),
  getBookQueue: (bookId) => api.get(`/reservations/book/${bookId}`),
  place: (data) => api.post('/reservations', data),
  cancel: (id) => api.delete(`/reservations/${id}`),
};

// ---- Fines ----
export const finesApi = {
  list: (params) => api.get('/fines', { params }),
  pay: (id, data) => api.post(`/fines/${id}/pay`, data),
  waive: (id, data) => api.post(`/fines/${id}/waive`, data),
  payAll: (userId, data) => api.post(`/fines/pay-all/${userId}`, data),
  issue: (data) => api.post('/fines/issue', data),
};

// ---- Reports ----
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  inventory: () => api.get('/reports/inventory'),
  overdue: () => api.get('/reports/overdue'),
  fines: (params) => api.get('/reports/fines', { params }),
  circulation: (params) => api.get('/reports/circulation', { params }),
  notifications: (params) => api.get('/reports/notifications', { params }),
  markNotificationRead: (id) => api.put(`/reports/notifications/${id}/read`),
  getSettings: () => api.get('/reports/settings'),
  updateSettings: (data) => api.put('/reports/settings', data),
};

export default api;

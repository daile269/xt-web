import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      const { state } = JSON.parse(token);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        const refreshToken = state?.refreshToken;

        if (refreshToken) {
          try {
            // Try to refresh token
            const response = await api.post('/auth/refresh', { refreshToken });
            const { token: newAccessToken } = response.data;

            // Update stored token
            state.token = newAccessToken;
            localStorage.setItem('auth-storage', JSON.stringify({ state }));

            // Update default header
            api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);
            isRefreshing = false;

            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;

            // Refresh failed - clear auth and redirect
            localStorage.removeItem('auth-storage');
            if (!window.location.pathname.includes('/login')) {
              console.error('Token refresh failed, redirecting to login...');
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }
      }

      // No refresh token - clear auth and redirect
      localStorage.removeItem('auth-storage');
      if (!window.location.pathname.includes('/login')) {
        console.error('Authentication failed, redirecting to login...');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

// User
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  updateAvatar: (avatar) => api.put('/user/avatar', { avatar }),
  claimDailyBonus: () => api.post('/user/daily-bonus'),
  autoRefill: () => api.post('/user/auto-refill'),
  getStats: () => api.get('/user/stats'),
  getTransactions: (params) => api.get('/user/transactions', { params }),
};

// Room
export const roomAPI = {
  getRooms: (params) => api.get('/room/list', { params }),
  getRoom: (id) => api.get(`/room/${id}`),
  createRoom: (data) => api.post('/room/create', data),
  joinRoom: (id, data) => api.post(`/room/${id}/join`, data),
  leaveRoom: (id) => api.post(`/room/${id}/leave`),
};

// Game
export const gameAPI = {
  getHistory: (params) => api.get('/game/history', { params }),
  getLeaderboard: (params) => api.get('/game/leaderboard', { params }),
};

// Shop
export const shopAPI = {
  getItems: (params) => api.get('/shop/items', { params }),
  buyItem: (data) => api.post('/shop/buy', data),
  sellItem: (data) => api.post('/shop/sell', data),
  getInventory: () => api.get('/shop/inventory'),
};

// Transaction
export const transactionAPI = {
  requestDeposit: (data) => api.post('/transaction/request-deposit', data),
  requestWithdrawal: (data) => api.post('/transaction/request-withdrawal', data),
};

// Admin
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  adjustCoins: (userId, data) => api.post(`/admin/users/${userId}/coins`, data),
  banUser: (userId, data) => api.post(`/admin/users/${userId}/ban`, data),
  getRooms: () => api.get('/admin/rooms'),
  deleteRoom: (roomId) => api.delete(`/admin/rooms/${roomId}`),
  getTransactions: (params) => api.get('/admin/transactions', { params }),
  processTransaction: (id, data) => api.put(`/admin/transactions/${id}`, data),
  getStats: () => api.get('/admin/stats'),
};

export default api;

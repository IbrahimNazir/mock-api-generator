import axios from 'axios';

const API_URL = 'http://localhost:3000';

export const login = async (username, password) => {
  console.log("{ username, password } : ", { username, password })
  const response = await axios.post(
    `${API_URL}/auth/login`,
    { username, password },
    { withCredentials: true }
  );
  localStorage.setItem('accessToken', response.data.accessToken);
  return response.data.user;
};

export const register = async (username, email, password) => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    username,
    email,
    password,
  });
  return response.data;
};

export const logout = async () => {
  await axios.post(
    `${API_URL}/auth/logout`,
    {},
    { withCredentials: true }
  );
  localStorage.removeItem('accessToken');
};

export const refreshToken = async () => {
  const response = await axios.post(
    `${API_URL}/auth/refresh-token`,
    {},
    { withCredentials: true }
  );
  localStorage.setItem('accessToken', response.data.accessToken);
  return response.data.accessToken;
};

export const getProfile = async () => {
  return await axios.get(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const updateProfile = async (data) => {
  return await axios.put(`${API_URL}/auth/profile`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const getSessions = async () => {
  return await axios.get(`${API_URL}/auth/sessions`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const revokeSession = async (sessionId) => {
  return await axios.delete(`${API_URL}/auth/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const revokeAllSessions = async () => {
  return await axios.delete(`${API_URL}/auth/sessions`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    withCredentials: true,
  });
};

// Axios interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshToken();
        originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
        return axios(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
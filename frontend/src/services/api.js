import axios from 'axios';

const API_URL = 'http://localhost:3000';

export const createApi = async (data) => {
  return await axios.post(`${API_URL}/api`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const getApis = async () => {
  return await axios.get(`${API_URL}/api`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const getApiById = async (id) => {
  return await axios.get(`${API_URL}/api/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const updateApi = async (id, data) => {
  return await axios.put(`${API_URL}/api/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const deleteApi = async (id) => {
  return await axios.delete(`${API_URL}/api/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const getMockUsers = async (apiId) => {
  return await axios.get(`${API_URL}/mock/${apiId}/users`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const getMockUserById = async (apiId, id) => {
  return await axios.get(`${API_URL}/mock/${apiId}/users?id=${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const createMockUser = async (apiId, data) => {
  return await axios.post(`${API_URL}/mock/${apiId}/users`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const updateMockUser = async (apiId, id, data) => {
  return await axios.put(`${API_URL}/mock/${apiId}/users?id=${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

export const deleteMockUser = async (apiId, id) => {
  return await axios.delete(`${API_URL}/mock/${apiId}/users?id=${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};
import axios from 'axios';
import Cookies from 'js-cookie';

export const BASE_URL = 'https://mock-api-generator.onrender.com/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface API {
  id: string;
  user_id: string;
  name: string;
  version: string;
  description: string;
  base_path: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Endpoint {
  id: string;
  api_id: string;
  path: string;
  methods: string[];
  description: string;
  mock_enabled: boolean;
  mock_count: number;
  faker_seed: string | number;
  schema: any;
  created_at: string;
  updated_at: string;
}

export interface MockResource {
  id: string;
  endpoint_id: string;
  parent_resource_ids: string | null;
  data: any;
  created_at: string;
  updated_at: string;
}

// Auth API
export const authAPI = {
  register: (data: { username: string; email: string; password: string; role: string }) =>
    api.post<{ user: User; token: string }>('/users/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/users/login', data),
  
  getProfile: () =>
    api.get<User>('/users/profile'),
  
  updateProfile: (data: { username?: string; email?: string }) =>
    api.put<User>('/users/profile', data),
  
  deleteProfile: () =>
    api.delete('/users/profile'),
};

// APIs API
export const apisAPI = {
  create: (data: {
    name: string;
    version: string;
    base_path: string;
    description: string;
    is_public: boolean;
  }) => api.post<API>('/apis', data),
  
  getUserAPIs: () =>
    api.get<API[]>('/users/apis'),
  
  getAPI: (id: string) =>
    api.get<API>(`/apis/${id}`),
  
  updateAPI: (id: string, data: Partial<API>) =>
    api.put<API>(`/apis/${id}`, data),
  
  deleteAPI: (id: string) =>
    api.delete(`/apis/${id}`),
};

// Endpoints API
export const endpointsAPI = {
  create: (data: {
    api_id: string;
    path: string;
    methods: string[];
    description: string;
    mock_enabled: boolean;
    mock_count: number;
    faker_seed: string | number;
    schema: any;
  }) => api.post<{ endpoint: Endpoint; resources: MockResource[] }>('/endpoints', data),
  
  getByAPI: (apiId: string) =>
    api.get<Endpoint[]>(`/endpoints/api/${apiId}`),
  
  getEndpoint: (id: string) =>
    api.get<Endpoint>(`/endpoints/${id}`),
  
  updateEndpoint: (id: string, data: Partial<Endpoint>) =>
    api.put<Endpoint>(`/endpoints/${id}`, data),
  
  deleteEndpoint: (id: string) =>
    api.delete(`/endpoints/${id}`),
  
  getMockData: (id: string) =>
    api.get<MockResource[]>(`/endpoints/${id}/mock`),
};

export default api;
import api from './api';

export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const getAdminUserById = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const updateUserStatus = async (id, status, reason = '') => {
  const response = await api.put(`/admin/users/${id}/status`, { status, reason });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

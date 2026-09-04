import api from './api';

/**
 * Retrieves authenticated user profile from GET /api/users/profile
 */
export const getUserProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

/**
 * Updates authenticated user contact details via PUT /api/users/profile
 */
export const updateUserProfile = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

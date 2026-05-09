import axiosClient from './axiosClient';

export const userApi = {
  getAllUsers: (params?: { search?: string; role?: string }) => {
    return axiosClient.get('/users', { params });
  },
  deleteUser: (id: string) => {
    return axiosClient.delete(`/users/${id}`);
  },
};

import axiosClient from './axiosClient';

export const authApi = {
  login: (data: { email: string; password: string }) => {
    return axiosClient.post('/auth/login', data);
  },
  register: (data: { email: string; password: string; fullName: string }) => {
    return axiosClient.post('/auth/register', data);
  },
};
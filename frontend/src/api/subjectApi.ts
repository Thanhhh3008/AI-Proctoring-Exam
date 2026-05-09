import axiosClient from './axiosClient';

export const subjectApi = {
  getAllSubjects: () => {
    return axiosClient.get('/subjects');
  },
  createSubject: (data: { name: string; subjectCode?: string; description?: string }) => {
    return axiosClient.post('/subjects', data);
  },
  updateSubject: (id: string, data: { name: string; subjectCode?: string; description?: string }) => {
    return axiosClient.put(`/subjects/${id}`, data);
  },
  deleteSubject: (id: string) => {
    return axiosClient.delete(`/subjects/${id}`);
  }
};

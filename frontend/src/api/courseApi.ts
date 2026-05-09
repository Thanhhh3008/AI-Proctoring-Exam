import axiosClient from './axiosClient';

export const courseApi = {
  getCourseContent: (classId: string) => axiosClient.get(`/course-content/class/${classId}`),
  seedCourseContent: (classId: string) => axiosClient.post(`/course-content/seed/${classId}`),
  

  getActivityDetail: (activityId: string) => axiosClient.get(`/course-content/activity/${activityId}`),
  createSection: (data: any) => axiosClient.post('/course-content/section', data),
  createActivity: (data: any) => axiosClient.post('/course-content/activity', data),
};
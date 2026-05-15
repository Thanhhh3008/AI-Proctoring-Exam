import axiosClient from './axiosClient';

export const classApi = {
  // Lấy danh sách khóa học của sinh viên đang đăng nhập
  getMyClasses: () => {
    return axiosClient.get('/classes/my-classes');
  },
  
  //  Gọi backend tự động tạo dữ liệu mẫu
  seedMockData: () => {
    return axiosClient.post('/classes/seed-mock-data');
  },

  // Admin methods
  getAllClassesAdmin: () => {
    return axiosClient.get('/classes/admin/all');
  },
  deleteClassAdmin: (id: string) => {
    return axiosClient.delete(`/classes/admin/${id}`);
  }
};
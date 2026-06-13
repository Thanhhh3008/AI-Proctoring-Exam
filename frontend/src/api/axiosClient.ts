import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', // Đường dẫn tới Backend NestJS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm Interceptor: Tự động nhét Token vào mỗi Request trước khi gửi đi
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Lấy token từ kho lưu trữ của trình duyệt
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;
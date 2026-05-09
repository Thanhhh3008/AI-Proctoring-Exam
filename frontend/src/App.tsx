import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Login/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import CourseDetailPage from './pages/CourseDetail/CourseDetailPage';
import ActivityDetailPage from './pages/ActivityDetail/ActivityDetailPage';
import RegisterPage from './pages/Register/RegisterPage';
import TeacherDashboard from './pages/TeacherDashboard/TeacherDashboard';
import TeacherCourseDetail from './pages/TeacherCourseDetail/TeacherCourseDetail';
import TeacherActivityDetail from './pages/TeacherActivityDetail/TeacherActivityDetail';
import TeacherGradingList from './pages/TeacherActivityDetail/TeacherGradingList';
import StudentAvailableClasses from './pages/StudentAvailableClasses/StudentAvailableClasses';
import StudentAvailableCourseDetail from './pages/StudentAvailableClasses/StudentAvailableCourseDetail';
import Profile from './pages/Profile/ProfilePage';
import BlogPage from './pages/Blog/BlogPage';
import BlogDetail from './pages/Blog/BlogDetail';
import ForgotPasswordPage from './pages/Login/ForgotPasswordPage';
import TeacherBankDetail from './pages/TeacherBankDetail/TeacherBankDetail';
import TeacherProfile from './pages/TeacherProfile/TeacherProfile';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import PaymentResult from './pages/Payment/PaymentResult';
import TeacherExamQuestions from './pages/TeacherExamQuestions/TeacherExamQuestions';
import StudentExamRoom from './pages/StudentExamRoom/StudentExamRoom';
import TeacherExamGrading from './pages/TeacherExamGrading/TeacherExamGrading';
import TeacherExamGradingDetail from './pages/TeacherExamGrading/TeacherExamGradingDetail';
import StudentExamReview from './pages/StudentExamReview/StudentExamReview';
import TeacherProctoringDashboard from './pages/TeacherActivityDetail/TeacherProctoringDashboard';
import AdminLayout from './layouts/AdminLayout/AdminLayout';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import AdminUserList from './pages/AdminUserList/AdminUserList';
import AdminSubjectList from './pages/AdminSubjectList/AdminSubjectList';
import AdminProctoring from './pages/AdminProctoring/AdminProctoring';
import AdminSettings from './pages/AdminSettings/AdminSettings';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================= */}
        {/* KHỐI 1: CÁC TRANG CÓ HEADER & FOOTER CHUNG (MAIN LAYOUT) */}
        {/* ========================================================= */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/activity/:id" element={<ActivityDetailPage />} />
          <Route path="/teacher/class/:classId" element={<TeacherCourseDetail />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/activity/:id" element={<TeacherActivityDetail />} />
          <Route path="/teacher/activity/:id/grading" element={<TeacherGradingList />} />
          <Route path="/available-classes" element={<StudentAvailableClasses />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/available-classes/:id" element={<StudentAvailableCourseDetail />} />
          <Route path="/teacher/class/:classId/bank/:bankId" element={<TeacherBankDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/teacher-profile/:teacherId" element={<TeacherProfile />} />
          <Route path="/teacher/exam/:examId/manage-questions" element={<TeacherExamQuestions />} />
          <Route path="/teacher/exam/:examId/grading" element={<TeacherExamGrading />} />
          <Route path="/teacher/exam/:examId/proctoring" element={<TeacherProctoringDashboard />} />
          {/* ĐÃ XÓA ROUTE PHÒNG THI Ở ĐÂY */}
        </Route>

        {/* ========================================================= */}
        {/* KHỐI 2: CÁC TRANG ĐỘC LẬP (KHÔNG CÓ HEADER & FOOTER) */}
        {/* ========================================================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />


        <Route path="/exam-room/:examId" element={<StudentExamRoom />} />
        <Route path="/teacher/exam/:examId/session/:sessionId/grade" element={<TeacherExamGradingDetail />} />
        <Route path="/student/exam/:examId/review/:sessionId" element={<StudentExamReview />} />

        {/* ========================================================= */}
        {/* KHỐI 3: CÁC TRANG ADMIN (ADMIN LAYOUT) */}
        {/* ========================================================= */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users/teachers" element={<AdminUserList />} />
          <Route path="/admin/users/students" element={<AdminUserList />} />
          <Route path="/admin/subjects" element={<AdminSubjectList />} />
          <Route path="/admin/proctoring" element={<AdminProctoring />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
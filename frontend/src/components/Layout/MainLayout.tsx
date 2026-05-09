import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function MainLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      {/* Outlet là nơi React Router nhét nội dung từng trang vào (Home, Dashboard, Course...) */}
      <main style={{ flex: 1, backgroundColor: '#f9fafc' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
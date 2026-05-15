import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  BookOutlined,
  AlertOutlined,
  SettingOutlined,
  LogoutOutlined,
  AuditOutlined,
  TeamOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [adminInfo, setAdminInfo] = useState({ fullName: 'Admin', avatarUrl: '' });
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = 'http://localhost:3000';
  
  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  useEffect(() => {
    const userRole = localStorage.getItem('role');
    if (userRole !== 'ADMIN') {
      setAccessDenied(true);
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }

    const fullName = localStorage.getItem('fullName');
    const avatarUrl = localStorage.getItem('avatarUrl');
    if (fullName) {
      setAdminInfo({ fullName, avatarUrl: avatarUrl || '' });
    }
  }, []);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: 'Quản lý người dùng',
      children: [
        { key: '/admin/users/teachers', label: 'Giáo viên' },
        { key: '/admin/users/students', label: 'Sinh viên' },
        { key: '/admin/users/face-approval', label: 'Duyệt ảnh sinh viên' },
      ],
    },
    {
      key: '/admin/subjects',
      icon: <BookOutlined />,
      label: 'Quản lý môn học',
    },
    {
      key: '/admin/classes',
      icon: <AuditOutlined />,
      label: 'Quản lý lớp học',
    },
    {
      key: '/admin/proctoring',
      icon: <AlertOutlined />,
      label: 'Giám sát vi phạm',
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt hệ thống',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />,
    },
    {
      key: 'home',
      label: 'Về trang chủ',
      icon: <HomeOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('role');
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'home') {
      navigate('/');
    }
  };

  if (accessDenied) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#f8fafc', position: 'fixed', top: 0, left: 0, zIndex: 10000
      }}>
        <div style={{ fontSize: '80px', color: '#ef4444', marginBottom: '24px' }}>
          <UserOutlined />
        </div>
        <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '28px' }}>Truy cập bị từ chối</h1>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '16px', textAlign: 'center', maxWidth: '450px', lineHeight: '1.6' }}>
          Rất tiếc! bạn không có quyền truy cập trang web này.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '12px 30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
          >
            Về trang chủ ngay
          </button>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Hệ thống sẽ tự chuyển hướng sau vài giây...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="admin-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} width={260}>
        <div className="logo-container">
          <Avatar 
            src={resolveImageUrl(adminInfo.avatarUrl)} 
            icon={<UserOutlined />} 
            size={collapsed ? 32 : 40}
          />
          {!collapsed && <span className="logo-text" style={{ marginLeft: 10 }}>{adminInfo.fullName}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Button 
              type="text" 
              icon={<HomeOutlined />} 
              onClick={() => navigate('/')}
              style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}
            >
              Về trang chủ
            </Button>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space className="user-profile-trigger" style={{ cursor: 'pointer' }}>
                <Avatar src={resolveImageUrl(adminInfo.avatarUrl)} icon={<UserOutlined />} />
                <span className="user-name">{adminInfo.fullName}</span>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'initial'
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

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
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = 'http://localhost:3000';
  
  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  useEffect(() => {
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

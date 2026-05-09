import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Input, Select, Modal, message, Card, Typography, Avatar } from 'antd';
import { SearchOutlined, DeleteOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { userApi } from '../../api/userApi';

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const AdminUserList: React.FC = () => {
  const BACKEND_URL = 'http://localhost:3000';
  const [users, setUsers] = useState<any[]>([]);
  
  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAllUsers({
        search: searchText,
        role: roleFilter,
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]); // Auto fetch when role changes. Search will use button.

  const handleSearch = () => {
    fetchUsers();
  };

  const handleDelete = (record: any) => {
    confirm({
      title: `Bạn có chắc chắn muốn xóa người dùng này?`,
      icon: <ExclamationCircleOutlined />,
      content: `Xóa ${record.fullName} (${record.email}). Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await userApi.deleteUser(record.id);
          message.success('Xóa người dùng thành công');
          fetchUsers();
        } catch (error) {
          message.error('Xóa người dùng thất bại');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (record: any) => (
        <Space>
          <Avatar src={resolveImageUrl(record.avatarUrl)} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.fullName}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        if (role === 'ADMIN') color = 'volcano';
        if (role === 'TEACHER') color = 'green';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isVerified',
      key: 'isVerified',
      render: (isVerified: boolean) => (
        <Tag color={isVerified ? 'success' : 'warning'}>
          {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)}
            disabled={record.role === 'ADMIN'} // Bảo vệ Admin không bị xóa nhầm (tùy chọn)
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-user-list">
      <Title level={2}>Quản lý người dùng</Title>
      
      <Card variant="borderless" style={{ marginBottom: 24 }}>
        <Space wrap>
          <Input
            placeholder="Tìm theo tên hoặc email"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Lọc theo vai trò"
            style={{ width: 200 }}
            allowClear
            onChange={(value) => setRoleFilter(value)}
          >
            <Option value="ADMIN">Admin</Option>
            <Option value="TEACHER">Giáo viên</Option>
            <Option value="STUDENT">Sinh viên</Option>
          </Select>
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
          <Button onClick={() => { setSearchText(''); setRoleFilter(undefined); fetchUsers(); }}>
            Làm mới
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default AdminUserList;

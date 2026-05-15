import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Input, Select, Modal, message, Card, Typography, Avatar, Image, Tooltip } from 'antd';
import { SearchOutlined, DeleteOutlined, UserOutlined, ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { userApi } from '../../api/userApi';
import axiosClient from '../../api/axiosClient';

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AdminUserList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [faceModalUser, setFaceModalUser] = useState<any | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);

  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAllUsers({ search: searchText, role: roleFilter });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleSearch = () => fetchUsers();

  const handleDelete = (record: any) => {
    confirm({
      title: `Bạn có chắc chắn muốn xóa người dùng này?`,
      icon: <ExclamationCircleOutlined />,
      content: `Xóa ${record.fullName} (${record.email}). Hành động này không thể hoàn tác.`,
      okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
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

  const handleApproveFace = async (userId: string, approved: boolean) => {
    setApproveLoading(true);
    try {
      await axiosClient.patch(`/users/${userId}/approve-face`, { approved });
      message.success(approved ? 'Đã xác nhận ảnh thành công!' : 'Đã từ chối ảnh!');
      setFaceModalUser(null);
      fetchUsers();
    } catch (err) {
      message.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setApproveLoading(false);
    }
  };

  const columns = [
    {
      title: 'Người dùng', key: 'user',
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
      title: 'Vai trò', dataIndex: 'role', key: 'role',
      render: (role: string) => {
        let color = 'blue';
        if (role === 'ADMIN') color = 'volcano';
        if (role === 'TEACHER') color = 'green';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Tài khoản', dataIndex: 'isVerified', key: 'isVerified',
      render: (isVerified: boolean) => (
        <Tag color={isVerified ? 'success' : 'warning'}>
          {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </Tag>
      ),
    },
    {
      title: 'Ảnh khuôn mặt', key: 'facePhoto',
      render: (record: any) => {
        if (record.role !== 'STUDENT') return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
        if (!record.baseFaceUrl) {
          return <Tag color="default">Chưa có ảnh</Tag>;
        }
        if (record.facePhotoVerified) {
          return (
            <Space>
              <Tag color="success" icon={<CheckCircleOutlined />}>Đã xác nhận</Tag>
              <Tooltip title="Xem ảnh">
                <Button size="small" icon={<EyeOutlined />} onClick={() => setFaceModalUser(record)} />
              </Tooltip>
            </Space>
          );
        }
        return (
          <Space>
            <Tag color="warning">Chờ duyệt</Tag>
            <Button size="small" type="primary" onClick={() => setFaceModalUser(record)}>Xem & Duyệt</Button>
          </Space>
        );
      },
    },
    {
      title: 'Ngày tham gia', dataIndex: 'createdAt', key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác', key: 'action',
      render: (record: any) => (
        <Space size="middle">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} disabled={record.role === 'ADMIN'}>
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
          <Select placeholder="Lọc theo vai trò" style={{ width: 200 }} allowClear onChange={(value) => setRoleFilter(value)}>
            <Option value="ADMIN">Admin</Option>
            <Option value="TEACHER">Giáo viên</Option>
            <Option value="STUDENT">Sinh viên</Option>
          </Select>
          <Button type="primary" onClick={handleSearch} loading={loading}>Tìm kiếm</Button>
          <Button onClick={() => { setSearchText(''); setRoleFilter(undefined); fetchUsers(); }}>Làm mới</Button>
        </Space>
      </Card>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      {/* MODAL DUYỆT ẢNH KHUÔN MẶT */}
      <Modal
        open={!!faceModalUser}
        onCancel={() => setFaceModalUser(null)}
        footer={null}
        title={`Ảnh xác thực khuôn mặt — ${faceModalUser?.fullName}`}
        width={480}
      >
        {faceModalUser && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <Tag color={faceModalUser.facePhotoVerified ? 'success' : 'warning'} style={{ fontSize: 13 }}>
                {faceModalUser.facePhotoVerified ? 'Đã xác nhận' : 'Đang chờ duyệt'}
              </Tag>
            </div>

            <Image
              src={resolveImageUrl(faceModalUser.baseFaceUrl)}
              alt="Ảnh chân dung"
              style={{ maxWidth: 280, maxHeight: 340, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0' }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />

            <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
              {faceModalUser.email}
            </div>

            {!faceModalUser.facePhotoVerified && (
              <Space style={{ marginTop: 24, justifyContent: 'center' }}>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={approveLoading}
                  onClick={() => handleApproveFace(faceModalUser.id, true)}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  Xác nhận ảnh hợp lệ
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={approveLoading}
                  onClick={() => handleApproveFace(faceModalUser.id, false)}
                >
                  Từ chối (Yêu cầu chụp lại)
                </Button>
              </Space>
            )}

            {faceModalUser.facePhotoVerified && (
              <div style={{ marginTop: 16 }}>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={approveLoading}
                  onClick={() => handleApproveFace(faceModalUser.id, false)}
                >
                  Thu hồi xác nhận
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUserList;

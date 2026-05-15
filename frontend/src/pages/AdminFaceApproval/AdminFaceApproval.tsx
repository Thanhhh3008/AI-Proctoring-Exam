import React, { useEffect, useState } from 'react';
import { Table, Space, Button, message, Card, Typography, Avatar, Image, Tag } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { userApi } from '../../api/userApi';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AdminFaceApproval: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAllUsers({ role: 'STUDENT', pendingFace: true });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
      message.error('Không thể tải danh sách sinh viên chờ duyệt ảnh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApproveFace = async (userId: string, approved: boolean) => {
    setApproveLoading(userId);
    try {
      await axiosClient.patch(`/users/${userId}/approve-face`, { approved });
      message.success(approved ? 'Đã xác nhận ảnh thành công!' : 'Đã từ chối ảnh!');
      // Remove the user from the list
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      message.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setApproveLoading(null);
    }
  };

  const columns = [
    {
      title: 'Sinh viên',
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
      title: 'Ảnh chờ duyệt',
      key: 'facePhoto',
      align: 'center' as const,
      render: (record: any) => (
        <Image
          src={resolveImageUrl(record.baseFaceUrl)}
          alt="Ảnh chân dung"
          style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
      ),
    },
    {
      title: 'Ngày nộp ảnh',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: () => <Tag color="processing">Gần đây</Tag>, // We can update this if we track when the photo was uploaded, but for now we just show a tag
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (record: any) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={approveLoading === record.id}
            onClick={() => handleApproveFace(record.id, true)}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Duyệt ảnh
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            loading={approveLoading === record.id}
            onClick={() => handleApproveFace(record.id, false)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-face-approval">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Duyệt ảnh sinh viên</Title>
          <Text type="secondary">Danh sách các sinh viên đang chờ Admin xác nhận ảnh chân dung để vào thi.</Text>
        </div>
        <Button onClick={fetchPendingUsers} loading={loading}>Làm mới danh sách</Button>
      </div>

      <Card variant="borderless">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Không có sinh viên nào đang chờ duyệt ảnh.' }}
        />
      </Card>
    </div>
  );
};

export default AdminFaceApproval;

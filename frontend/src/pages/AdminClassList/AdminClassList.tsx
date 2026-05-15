import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Input, Modal, message, Card, Typography, Tag, Tooltip } from 'antd';
import { SearchOutlined, DeleteOutlined, ExclamationCircleOutlined, TeamOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { classApi } from '../../api/classApi';

const { Title } = Typography;
const { confirm } = Modal;

const AdminClassList: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await classApi.getAllClassesAdmin();
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      message.error('Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredClasses = classes.filter(cls => 
    cls.classCode.toLowerCase().includes(searchText.toLowerCase()) ||
    (cls.subject?.name && cls.subject.name.toLowerCase().includes(searchText.toLowerCase())) ||
    (cls.teacher?.fullName && cls.teacher.fullName.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleDelete = (record: any) => {
    confirm({
      title: 'Bạn có chắc chắn muốn xóa lớp học này?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Xóa lớp học <strong>{record.classCode}</strong> - {record.subject?.name}.</p>
          <p style={{ color: '#ff4d4f' }}>Lưu ý: Tất cả dữ liệu bài tập, bài thi và điểm số của sinh viên trong lớp này sẽ bị xóa vĩnh viễn và không thể khôi phục!</p>
        </div>
      ),
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await classApi.deleteClassAdmin(record.id);
          message.success('Xóa lớp học thành công');
          fetchClasses();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Xóa lớp học thất bại');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Mã lớp',
      dataIndex: 'classCode',
      key: 'classCode',
      render: (code: string) => <Tag color="blue" style={{ fontWeight: 'bold' }}>{code}</Tag>,
    },
    {
      title: 'Môn học',
      dataIndex: ['subject', 'name'],
      key: 'subjectName',
      render: (text: string) => <span><BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />{text || 'N/A'}</span>,
    },
    {
      title: 'Giảng viên',
      dataIndex: ['teacher', 'fullName'],
      key: 'teacherName',
      render: (text: string, record: any) => (
        <Tooltip title={record.teacher?.email}>
          <span><UserOutlined style={{ marginRight: 8, color: '#52c41a' }} />{text || 'N/A'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Sĩ số',
      key: 'students',
      render: (record: any) => (
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          {record._count?.students || 0} / {record.maxStudents}
        </span>
      ),
    },
    {
      title: 'Học phí',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <span style={{ color: price > 0 ? '#fa8c16' : '#52c41a', fontWeight: 'bold' }}>
          {price > 0 ? `${price.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'ACTIVE' ? 'green' : 'default';
        const text = status === 'ACTIVE' ? 'Đang mở' : 'Đã kết thúc';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (record: any) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDelete(record)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-class-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Quản lý lớp học</Title>
      </div>
      
      <Card variant="borderless" style={{ marginBottom: 24 }}>
        <Input
          placeholder="Tìm kiếm theo mã lớp, tên môn hoặc tên giảng viên..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 500 }}
          allowClear
        />
      </Card>

      <Table
        columns={columns}
        dataSource={filteredClasses}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default AdminClassList;

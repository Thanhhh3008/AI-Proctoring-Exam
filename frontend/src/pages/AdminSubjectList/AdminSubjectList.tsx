import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Input, Modal, message, Card, Typography, Form } from 'antd';
import { SearchOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ExclamationCircleOutlined, BookOutlined } from '@ant-design/icons';
import { subjectApi } from '../../api/subjectApi';

const { Title } = Typography;
const { confirm } = Modal;

const AdminSubjectList: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await subjectApi.getAllSubjects();
      // Assume response.data is the array of subjects
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      message.error('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredSubjects = subjects.filter(sub => 
    sub.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (sub.subjectCode && sub.subjectCode.toLowerCase().includes(searchText.toLowerCase()))
  );

  const showModal = (subject?: any) => {
    if (subject) {
      setEditingSubject(subject);
      form.setFieldsValue(subject);
    } else {
      setEditingSubject(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingSubject) {
        await subjectApi.updateSubject(editingSubject.id, values);
        message.success('Cập nhật môn học thành công');
      } else {
        await subjectApi.createSubject(values);
        message.success('Thêm môn học mới thành công');
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: any) => {
    confirm({
      title: 'Bạn có chắc chắn muốn xóa môn học này?',
      icon: <ExclamationCircleOutlined />,
      content: `Xóa môn học "${record.name}". Lưu ý: Môn học này có thể đang chứa các lớp học và ngân hàng câu hỏi.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await subjectApi.deleteSubject(record.id);
          message.success('Xóa môn học thành công');
          fetchSubjects();
        } catch (error) {
          message.error('Xóa môn học thất bại. Có thể môn học đang được sử dụng.');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Mã môn',
      dataIndex: 'subjectCode',
      key: 'subjectCode',
      render: (subjectCode: string) => <code style={{ color: '#eb2f96', fontWeight: 'bold' }}>{subjectCode || 'N/A'}</code>,
    },
    {
      title: 'Tên môn học',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1890ff' }} />} 
            onClick={() => showModal(record)}
          >
            Sửa
          </Button>
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-subject-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Quản lý môn học</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => showModal()}
        >
          Thêm môn học mới
        </Button>
      </div>
      
      <Card variant="borderless" style={{ marginBottom: 24 }}>
        <Input
          placeholder="Tìm kiếm môn học theo tên hoặc mã..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
          allowClear
        />
      </Card>

      <Table
        columns={columns}
        dataSource={filteredSubjects}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingSubject ? "Chỉnh sửa môn học" : "Thêm môn học mới"}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ name: '', subjectCode: '', description: '' }}
        >
          <Form.Item
            name="name"
            label="Tên môn học"
            rules={[{ required: true, message: 'Vui lòng nhập tên môn học!' }]}
          >
            <Input placeholder="Ví dụ: Lập trình Java" />
          </Form.Item>
          <Form.Item
            name="subjectCode"
            label="Mã môn học"
            rules={[{ required: true, message: 'Vui lòng nhập mã môn học!' }]}
          >
            <Input placeholder="Ví dụ: IT101" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={4} placeholder="Nhập mô tả ngắn về môn học" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingSubject ? "Cập nhật" : "Thêm mới"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminSubjectList;

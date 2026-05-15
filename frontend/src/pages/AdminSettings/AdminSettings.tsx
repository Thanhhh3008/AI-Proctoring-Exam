import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Switch,
  InputNumber,
  Space,
  message,
  Divider,
  Row,
  Col,
  Tabs,
  Alert
} from 'antd';
import {
  SaveOutlined,
  GlobalOutlined,
  SafetyOutlined,
  LockOutlined,
  BellOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const AdminSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/settings');
      form.setFieldsValue(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      message.error('Không thể tải cài đặt hệ thống');
    } finally {
      setLoading(true); // Wait, should be false
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await axiosClient.post('/settings', values);
      message.success('Đã lưu cài đặt hệ thống thành công');
    } catch (error) {
      message.error('Lưu cài đặt thất bại');
    } finally {
      setSaving(false);
    }
  };

  const items = [
    {
      key: '1',
      label: <Space><GlobalOutlined /> Cấu hình chung</Space>,
      children: (
        <Card variant="borderless">
          <Title level={4}>Thông tin nền tảng</Title>
          <Form.Item name={['general', 'siteName']} label="Tên hệ thống" rules={[{ required: true }]}>
            <Input placeholder="Nhập tên hệ thống" />
          </Form.Item>
          <Form.Item name={['general', 'contactEmail']} label="Email liên hệ" rules={[{ type: 'email' }]}>
            <Input placeholder="nthanh30082004@gmail.com" />
          </Form.Item>

          <Divider />
          <Title level={4}><LockOutlined /> Quy định mật khẩu</Title>
          <Alert
            message="Các thay đổi này sẽ áp dụng cho tất cả người dùng khi họ đổi mật khẩu hoặc đăng ký mới."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Form.Item name={['general', 'passwordPolicy', 'minLength']} label="Độ dài tối thiểu">
            <InputNumber min={4} max={20} />
          </Form.Item>
          <Form.Item name={['general', 'passwordPolicy', 'requireSpecialChar']} label="Bắt buộc ký tự đặc biệt" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['general', 'passwordPolicy', 'requireUppercase']} label="Bắt buộc chữ hoa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>
      ),
    },
    {
      key: '2',
      label: <Space><SafetyOutlined /> Giám sát AI (AI Proctoring)</Space>,
      children: (
        <Card variant="borderless">
          <Title level={4}>Cấu hình giám sát thông minh</Title>
          <Alert
            message="Cấu hình này ảnh hưởng trực tiếp đến hiệu năng và độ nhạy của hệ thống giám sát trong lúc thi."
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name={['proctoring', 'aiSensitivity']} label="Độ nhạy AI (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['proctoring', 'captureInterval']} label="Tần suất chụp ảnh (giây)">
                <InputNumber min={5} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name={['proctoring', 'enableFaceDetection']} label="Bật phát hiện khuôn mặt" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['proctoring', 'enableTabDetection']} label="Bật phát hiện chuyển Tab" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['proctoring', 'autoLockThreshold']} label="Ngưỡng tự động khóa bài (số lần vi phạm)">
            <InputNumber min={1} max={100} />
          </Form.Item>
          <Text type="secondary">Sinh viên sẽ bị khóa bài thi nếu số lần vi phạm vượt quá ngưỡng này.</Text>
        </Card>
      ),
    },
  ];

  return (
    <div className="admin-settings">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Cài đặt hệ thống</Title>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          onClick={() => form.submit()}
          loading={saving}
        >
          Lưu thay đổi
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{}}
      >
        <Tabs defaultActiveKey="1" items={items} />
      </Form>
    </div>
  );
};

export default AdminSettings;

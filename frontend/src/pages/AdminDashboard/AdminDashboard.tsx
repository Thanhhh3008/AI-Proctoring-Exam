import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const { Title, Text } = Typography;

// Mock data cho biểu đồ tăng trưởng người dùng
const userData = [
  { name: 'T2', students: 400, teachers: 24 },
  { name: 'T3', students: 300, teachers: 13 },
  { name: 'T4', students: 200, teachers: 98 },
  { name: 'T5', students: 278, teachers: 39 },
  { name: 'T6', students: 189, teachers: 48 },
  { name: 'T7', students: 239, teachers: 38 },
  { name: 'CN', students: 349, teachers: 43 },
];

// Mock data cho vi phạm AI
const violationData = [
  { name: '08:00', count: 12 },
  { name: '10:00', count: 45 },
  { name: '12:00', count: 23 },
  { name: '14:00', count: 67 },
  { name: '16:00', count: 34 },
  { name: '18:00', count: 10 },
];

// Mock data cho các kỳ thi mới nhất
const recentExams = [
  {
    key: '1',
    name: 'Kiểm tra Giải tích 1',
    teacher: 'Nguyễn Trần Thành',
    status: 'Đang diễn ra',
    violations: 5,
  },
  {
    key: '2',
    name: 'Lập trình hướng đối tượng',
    teacher: 'Lê Minh Hoàng',
    status: 'Chờ bắt đầu',
    violations: 0,
  },
  {
    key: '3',
    name: 'Tiếng Anh chuyên ngành',
    teacher: 'Nguyễn Trần Thành',
    status: 'Đã kết thúc',
    violations: 12,
  },
];

const AdminDashboard: React.FC = () => {
  const columns = [
    {
      title: 'Tên kỳ thi',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'Giáo viên',
      dataIndex: 'teacher',
      key: 'teacher',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'geekblue';
        if (status === 'Đang diễn ra') color = 'green';
        if (status === 'Đã kết thúc') color = 'volcano';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Số vi phạm',
      dataIndex: 'violations',
      key: 'violations',
      render: (v: number) => (
        <Text type={v > 10 ? 'danger' : 'warning'}>{v} lỗi</Text>
      ),
    },
  ];

  return (
    <div className="admin-dashboard">
      <Title level={2}>Dashboard Tổng Quan</Title>

      {/* Khối thống kê nhanh */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Tổng sinh viên"
              value={1250}
              prefix={<UserOutlined style={{ color: '#1677ff' }} />}
              suffix={<span style={{ fontSize: 12, color: '#3f8600' }}><ArrowUpOutlined /> 12%</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Tổng giáo viên"
              value={48}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              suffix={<span style={{ fontSize: 12, color: '#3f8600' }}><ArrowUpOutlined /> 4%</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Kỳ thi đang chạy"
              value={15}
              prefix={<SafetyCertificateOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="Cảnh báo AI (Hôm nay)"
              value={36}
              styles={{ content: { color: '#cf1322' } }}
              prefix={<AlertOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#cf1322' }}><ArrowDownOutlined /> 2%</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Tăng trưởng người dùng (7 ngày qua)" variant="borderless">
            <div style={{ height: 300, minHeight: 300 }}>
              <ResponsiveContainer width="99%" height="100%">
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="students" stroke="#1677ff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Sinh viên" />
                  <Line type="monotone" dataKey="teachers" stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Giáo viên" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Tần suất vi phạm AI" variant="borderless">
            <div style={{ height: 300, minHeight: 300 }}>
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={violationData}>
                  <defs>
                    <linearGradient id="colorViolation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorViolation)" name="Số vi phạm" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Danh sách kỳ thi mới nhất */}
      <Card title="Các kỳ thi mới nhất" variant="borderless" style={{ marginTop: 24 }}>
        <Table columns={columns} dataSource={recentExams} pagination={false} />
      </Card>
    </div>
  );
};

export default AdminDashboard;

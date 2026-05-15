import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Badge, Avatar, Empty, Space, Button, Flex, Divider } from 'antd';
import { 
  AlertOutlined, 
  MonitorOutlined, 
  UserOutlined, 
  ClockCircleOutlined, 
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const { Title, Text } = Typography;

const VIOLATION_LABELS: Record<string, string> = {
  TAB_SWITCH: 'Rời màn hình/Chuyển tab',
  FULLSCREEN_EXITED: 'Thoát toàn màn hình',
  COPY_PASTE: 'Thao tác chặn',
  MULTIPLE_FACES: 'Phát hiện nhiều người',
  NO_FACE: 'Không thấy mặt',
  DIFFERENT_PERSON: 'Sai người thi',
  LOOKING_AWAY: 'Nghi vấn nhìn chỗ khác',
  PHONE_DETECTED: 'Dùng điện thoại',
  STATIC_IMAGE: 'Sử dụng ảnh tĩnh',
};

const VIOLATION_COLORS: Record<string, string> = {
  TAB_SWITCH: '#f59e0b',
  FULLSCREEN_EXITED: '#8b5cf6',
  COPY_PASTE: '#6366f1',
  MULTIPLE_FACES: '#ef4444',
  NO_FACE: '#64748b',
  DIFFERENT_PERSON: '#dc2626',
  LOOKING_AWAY: '#f97316',
  PHONE_DETECTED: '#dc2626',
  STATIC_IMAGE: '#0ea5e9',
};

const AdminProctoring: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [activeExams, setActiveExams] = useState<any[]>([]);
  const BACKEND_URL = 'http://localhost:3000';

  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, feedRes, examsRes] = await Promise.all([
        axiosClient.get('/admin-proctoring/global-stats'),
        axiosClient.get('/admin-proctoring/live-feed'),
        axiosClient.get('/admin-proctoring/active-exams'),
      ]);
      setGlobalStats(statsRes.data);
      setLiveFeed(feedRes.data);
      setActiveExams(examsRes.data);
    } catch (err) {
      console.error('[AdminProctoring] Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Tự động làm mới mỗi 30 giây
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartData = globalStats?.violationsByType 
    ? Object.entries(globalStats.violationsByType).map(([type, value]) => ({
        name: VIOLATION_LABELS[type] || type,
        value
      }))
    : [];

  const COLORS = Object.values(VIOLATION_COLORS);

  return (
    <div className="admin-proctoring">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Hệ thống Giám sát AI</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới dữ liệu</Button>
      </div>

      {/* KPI CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic 
              title="Tổng số vi phạm ghi nhận" 
              value={globalStats?.totalViolations || 0} 
              prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic 
              title="Tổng số kỳ thi sử dụng AI" 
              value={globalStats?.totalAIExams || 0} 
              prefix={<MonitorOutlined style={{ color: '#1677ff' }} />} 
              suffix="Kỳ thi"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless">
            <Statistic 
              title="Tổng số người học" 
              value={globalStats?.totalStudents || 0} 
              prefix={<UserOutlined style={{ color: '#52c41a' }} />} 
              suffix="Thành viên"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* LIVE FEED */}
        <Col xs={24} lg={14}>
          <Card title="Bảng tin vi phạm thời gian thực" variant="borderless" style={{ height: '100%' }}>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {liveFeed.length > 0 ? (
                <Flex vertical gap="middle">
                  {liveFeed.map((item, index) => (
                    <div key={index} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Flex align="center" justify="space-between">
                        <Flex gap="middle" align="center">
                          <Badge dot color={VIOLATION_COLORS[item.type]}>
                            <Avatar src={resolveImageUrl(item.session?.student?.avatarUrl)} icon={<UserOutlined />} />
                          </Badge>
                          <div>
                            <Flex gap="small" align="center">
                              <Text strong>{item.session?.student?.fullName}</Text>
                              <Tag color={VIOLATION_COLORS[item.type]}>{VIOLATION_LABELS[item.type] || item.type}</Tag>
                            </Flex>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Kỳ thi: {item.session?.exam?.title}</Text>
                            </div>
                          </div>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                        </Text>
                      </Flex>
                    </div>
                  ))}
                </Flex>
              ) : (
                <Empty description="Chưa có vi phạm nào được ghi nhận gần đây" />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Flex vertical style={{ width: '100%' }} gap={16}>
            {/* ACTIVE EXAMS */}
            <Card title="Các kỳ thi đang trực tuyến" variant="borderless">
              <Flex vertical gap="small">
                {activeExams.length > 0 ? activeExams.map((exam, index) => (
                  <div key={index} style={{ padding: '8px 0', borderBottom: index < activeExams.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <Flex justify="space-between" align="center">
                      <Text strong>{exam.title}</Text>
                      <Badge count={exam.activeCount} style={{ backgroundColor: '#52c41a' }} />
                    </Flex>
                  </div>
                )) : <Text type="secondary">Không có kỳ thi nào đang diễn ra</Text>}
              </Flex>
            </Card>

            {/* CHART STATS */}
            <Card title="Tỷ lệ các loại vi phạm" variant="borderless">
              <div style={{ height: 250 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Text type="secondary">Chưa có dữ liệu thống kê</Text>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {chartData.map((entry, index) => (
                  <Tag key={index} color={COLORS[index % COLORS.length]}>{entry.name}</Tag>
                ))}
              </div>
            </Card>
          </Flex>
        </Col>
      </Row>

      {/* EVIDENCE GALLERY */}
      <Card title="Kho bằng chứng hình ảnh mới nhất" variant="borderless" style={{ marginTop: 24 }}>
        <Row gutter={[12, 12]}>
          {liveFeed.filter(f => f.evidenceUrl).slice(0, 12).map((item, idx) => (
            <Col xs={12} sm={8} md={6} lg={4} key={idx}>
              <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                <img 
                  src={resolveImageUrl(item.evidenceUrl)} 
                  alt="Evidence" 
                  style={{ width: '100%', height: 120, objectFit: 'cover' }} 
                />
                <div style={{ 
                  position: 'absolute', top: 8, right: 8 
                }}>
                  <Tag color={VIOLATION_COLORS[item.type]} style={{ margin: 0, fontSize: 10 }}>
                    {VIOLATION_LABELS[item.type] || item.type}
                  </Tag>
                </div>
                <div style={{ 
                  position: 'absolute', bottom: 0, left: 0, right: 0, 
                  padding: '4px 8px', background: 'rgba(0,0,0,0.6)', 
                  color: 'white', fontSize: 10,
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <span>{item.session?.student?.fullName}</span>
                  <span style={{ opacity: 0.8 }}>{new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </Col>
          ))}
          {liveFeed.filter(f => f.evidenceUrl).length === 0 && (
            <Col span={24}>
              <Empty description="Chưa có bằng chứng hình ảnh nào" />
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default AdminProctoring;

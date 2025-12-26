import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, List, Tag, App, Button, Table, Divider } from 'antd';
import { 
  BankOutlined, 
  EnvironmentOutlined, 
  IdcardOutlined, 
  TeamOutlined,
  RocketOutlined,
  CloudServerOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { PropertyService } from '../services/PropertyService';
import { MapService, SnapshotService } from '../services/MapService';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const AdminOverview: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    maps: 0,
    cards: 0,
    snapshots: 0
  });
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const [props, maps, cardsRes, snapshots] = await Promise.all([
          PropertyService.getAll().catch(() => []),
          MapService.getAll().catch(() => []),
          fetch(`http://${window.location.hostname}:3000/api/cards`).then(res => res.json()).catch(() => []),
          SnapshotService.getAll().catch(() => [])
        ]);
        
        setStats({
          properties: Array.isArray(props) ? props.length : 0,
          maps: Array.isArray(maps) ? maps.length : 0,
          cards: Array.isArray(cardsRes) ? cardsRes.length : 0,
          snapshots: Array.isArray(snapshots) ? snapshots.length : 0
        });

        if (Array.isArray(snapshots)) {
          const sorted = snapshots
            .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
            .slice(0, 5);
          setRecentSnapshots(sorted);
        }
      } catch (e) {
        message.error('获取统计数据失败');
      }
    };
    fetchAllStats();
  }, []);

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '32px 40px 24px 40px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          <RocketOutlined style={{ marginRight: 16, color: '#722ed1' }} />
          后台管理纵览
        </Title>
        <Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 800, marginBottom: 0 }}>
          欢迎来到大富翁管理后台。在这里，你可以定义游戏的核心资产、设计精美的地图并配置各种趣味性十足的命运/机会卡片。
        </Paragraph>
      </div>

      <div style={{ padding: '0 40px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ background: '#f9f0ff' }}>
              <Statistic
                title="地块库总数"
                value={stats.properties}
                valueStyle={{ color: '#722ed1' }}
                prefix={<BankOutlined />}
                suffix="块"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ background: '#e6f7ff' }}>
              <Statistic
                title="设计地图"
                value={stats.maps}
                valueStyle={{ color: '#1890ff' }}
                prefix={<EnvironmentOutlined />}
                suffix="张"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ background: '#f6ffed' }}>
              <Statistic
                title="卡片总数"
                value={stats.cards}
                valueStyle={{ color: '#52c41a' }}
                prefix={<IdcardOutlined />}
                suffix="张"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ background: '#fff7e6' }}>
              <Statistic
                title="游玩快照"
                value={stats.snapshots}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<CloudServerOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginTop: 32 }}>
          <Col span={15}>
            <Card 
              title={<Space><RocketOutlined /> 快速上手指南</Space>} 
              bordered={false}
              extra={<Button type="link" onClick={() => navigate('/admin/maps')}>去设计地图 <ArrowRightOutlined /></Button>}
            >
              <List
                itemLayout="horizontal"
                dataSource={[
                  { title: '第一步：构建资产库', desc: '在地块管理中定义各种土地与房产的价格、图标与所属主题。', tag: '核心' },
                  { title: '第二步：配置经济等级', desc: '设定不同地段的租金回报曲线，影响游戏内的平衡性。', tag: '平衡' },
                  { title: '第三步：地图逻辑编排', desc: '在地图设计中布置地块，并使用“自愈路径系统”连接路径走向。', tag: '进阶' },
                  { title: '第四步：发布游玩快照', desc: '导出独立的独立快照文件。快照将锁定所有元数据，确保游玩环境稳定。', tag: '发布' }
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space>{item.title} <Tag color={item.tag === '发布' ? 'orange' : 'purple'}>{item.tag}</Tag></Space>}
                      description={item.desc}
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card 
              title={<Space><HistoryOutlined /> 最近导出的快照</Space>} 
              style={{ marginTop: 24 }}
              bordered={false}
              extra={<Button type="link" onClick={() => navigate('/admin/snapshots')}>管理所有快照</Button>}
            >
              <Table 
                dataSource={recentSnapshots}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                  {
                    title: '地图名称',
                    dataIndex: 'name',
                    render: (text, record) => (
                      <Space>
                        <Text strong>{text}</Text>
                        <Tag color="blue" style={{ fontSize: '10px' }}>{record.version}</Tag>
                      </Space>
                    )
                  },
                  {
                    title: '导出时间',
                    dataIndex: 'publishedAt',
                    render: (date) => (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {new Date(date).toLocaleString()}
                      </Text>
                    )
                  }
                ]}
              />
            </Card>
          </Col>
          <Col span={9}>
            <Card title="系统架构信息" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div>
                  <div style={{ marginBottom: 8 }}><Text strong>持久化存储层</Text></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">设计草稿 (Maps)</Text>
                    <Tag color="blue">maps.json</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text type="secondary">游玩快照 (Snapshots)</Text>
                    <Tag color="orange">/data/snapshots/*.json</Tag>
                  </div>
                </div>
                
                <Divider style={{ margin: '8px 0' }} />

                <div>
                  <div style={{ marginBottom: 8 }}><Text strong>核心服务状态</Text></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">后端引擎</Text>
                    <Tag color="cyan">Node.js Express</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text type="secondary">实时通信</Text>
                    <Tag color="green">Socket.io</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text type="secondary">API 响应状态</Text>
                    <Tag color="processing">200 OK</Tag>
                  </div>
                </div>
              </Space>
            </Card>

            <Card title="开发者支持" bordered={false} style={{ marginTop: 24 }}>
              <Paragraph style={{ fontSize: '13px' }}>
                当前系统已实现“设计-发布”分离。设计阶段修改不会影响已发布的快照。
              </Paragraph>
              <Button block type="dashed" onClick={() => window.open('https://github.com/lllllan02/monopoly')}>
                查看项目文档
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AdminOverview;

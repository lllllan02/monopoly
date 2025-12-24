import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, List, Tag, message } from 'antd';
import { 
  BankOutlined, 
  EnvironmentOutlined, 
  IdcardOutlined, 
  TeamOutlined,
  RocketOutlined 
} from '@ant-design/icons';
import { PropertyService } from '../services/PropertyService';
import { MapService } from '../services/MapService';

const { Title, Paragraph, Text } = Typography;

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    properties: 0,
    maps: 0,
    cards: 0,
    online: 0
  });

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const [props, maps, cardsRes] = await Promise.all([
          PropertyService.getAll().catch(() => []),
          MapService.getAll().catch(() => []),
          fetch(`http://${window.location.hostname}:3000/api/cards`).then(res => res.json()).catch(() => [])
        ]);
        
        setStats({
          properties: Array.isArray(props) ? props.length : 0,
          maps: Array.isArray(maps) ? maps.length : 0,
          cards: Array.isArray(cardsRes) ? cardsRes.length : 0,
          online: 0
        });
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
                title="当前玩家"
                value={stats.online}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<TeamOutlined />}
                suffix="人"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginTop: 32 }}>
          <Col span={16}>
            <Card title="快速上手指南" bordered={false}>
              <List
                itemLayout="horizontal"
                dataSource={[
                  { title: '第一步：构建地块库', desc: '在地块管理中定义各种格子（房产、车站等）的价格与背景。', tag: '核心' },
                  { title: '第二步：设计经济体系', desc: '定义不同地段的租金回报率与特殊规则。', tag: '平衡' },
                  { title: '第三步：设计地图', desc: '利用插槽式设计，将地块库中的内容布置在地图中。', tag: '进阶' }
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space>{item.title} <Tag color="purple">{item.tag}</Tag></Space>}
                      description={item.desc}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="系统信息" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">后端引擎</Text>
                  <Tag color="blue">Node.js / Express</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">实时通信</Text>
                  <Tag color="green">Socket.io</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">持久化</Text>
                  <Tag color="orange">Lowdb (JSON)</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">局域网状态</Text>
                  <Tag color="cyan">在线</Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AdminOverview;

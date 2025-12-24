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
          PropertyService.getAll(),
          MapService.getAll(),
          fetch(`http://${window.location.hostname}:3000/api/cards`).then(res => res.json())
        ]);
        
        setStats({
          properties: props.length,
          maps: maps.length,
          cards: cardsRes.length,
          online: 0 // 未来通过 Socket 获取
        });
      } catch (e) {
        message.error('获取统计数据失败');
      }
    };
    fetchAllStats();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>
          <RocketOutlined style={{ marginRight: 12, color: '#722ed1' }} />
          后台纵览
        </Title>
        <Paragraph>
          欢迎来到大富翁管理后台。在这里，你可以定义游戏的核心资产、设计精美的地图并配置各种趣味性十足的命运/机会卡片。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable style={{ background: '#f9f0ff' }}>
            <Statistic
              title="房产库总数"
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
                { title: '第一步：构建房产库', desc: '在房产管理中定义各种地块的价格和租金倍率。', tag: '核心' },
                { title: '第二步：设计地图', desc: '利用插槽式设计，将房产布置在不同章节的地图中。', tag: '进阶' },
                { title: '第三步：配置卡组', desc: '编写命运和机会卡的文案与触发效果。', tag: '趣味' }
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
  );
};

export default AdminOverview;

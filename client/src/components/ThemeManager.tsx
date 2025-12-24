import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Tag, Typography } from 'antd';
import { RocketOutlined, BankOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
import { type Theme, ThemeService } from '../services/ThemeService';
import { PropertyService } from '../services/PropertyService';
import { MapService } from '../services/MapService';

interface ThemeWithStats extends Theme {
  propertyCount: number;
  mapCount: number;
}

const ThemeManager: React.FC = () => {
  const [themes, setThemes] = useState<ThemeWithStats[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchThemesAndStats = async () => {
    try {
      const [themesData, propsData, mapsData] = await Promise.all([
        ThemeService.getAll(),
        PropertyService.getAll(),
        MapService.getAll()
      ]);

             const themesWithStats = themesData.map(theme => ({
               ...theme,
               propertyCount: propsData.filter((p: any) => p.themeId === theme.id).length,
               mapCount: mapsData.filter((m: any) => m.themeId === theme.id).length
             }));

      setThemes(themesWithStats);
    } catch (error) {
      message.error('获取主题列表及统计失败');
    }
  };

  useEffect(() => {
    fetchThemesAndStats();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await ThemeService.delete(id);
      message.success('删除成功');
      fetchThemesAndStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await ThemeService.create(values);
      message.success('添加成功');
      setIsModalVisible(false);
      fetchThemesAndStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { 
      title: '主题名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 'bold' }}>{text}</span>
    },
    {
      title: '关联房产',
      dataIndex: 'propertyCount',
      key: 'propertyCount',
      render: (count: number) => (
        <Space>
          <BankOutlined style={{ color: '#722ed1' }} />
          <span>{count} 个房产</span>
        </Space>
      )
    },
    {
      title: '关联地图',
      dataIndex: 'mapCount',
      key: 'mapCount',
      render: (count: number) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#1890ff' }} />
          <span>{count} 张地图</span>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ThemeWithStats) => (
        <Popconfirm 
          title="确定要删除这个主题吗？" 
          description={record.propertyCount > 0 ? `该主题下尚有 ${record.propertyCount} 个房产，删除后它们将失去分类。` : undefined}
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <RocketOutlined style={{ marginRight: 16, color: '#722ed1' }} />
            主题分类管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            定义游戏的不同章节或视觉主题。通过主题，你可以将房产、经济等级和地图进行逻辑分组。
          </Typography.Paragraph>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<RocketOutlined />} 
          onClick={handleAdd}
          style={{ 
            borderRadius: '8px', 
            height: '50px', 
            padding: '0 32px', 
            fontSize: '16px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(114, 46, 209, 0.25)'
          }}
        >
          创建新主题
        </Button>
      </div>
      
      <div style={{ padding: '0 40px' }}>
        <Table 
          columns={columns} 
          dataSource={themes} 
          rowKey="id" 
          bordered={false} 
          pagination={false} 
          size="middle"
        />
      </div>

      <Modal
        title="创建新主题"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="主题名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 赛博朋克" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ThemeManager;

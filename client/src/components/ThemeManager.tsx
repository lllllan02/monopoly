import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Tag } from 'antd';
import { RocketOutlined, BankOutlined, EnvironmentOutlined } from '@ant-design/icons';
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
        propertyCount: propsData.filter((p: any) => p.theme === theme.name).length,
        mapCount: mapsData.filter((m: any) => m.theme === theme.name).length
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
    <div className="admin-content-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>主题管理</h2>
          <p style={{ color: '#8c8c8c', marginTop: 4 }}>定义分类标签，并查看每个分类下的内容规模。</p>
        </div>
        <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleAdd}>
          创建新主题
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={themes} 
        rowKey="id" 
        bordered 
        pagination={false} 
      />

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

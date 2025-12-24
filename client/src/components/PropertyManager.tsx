import React, { useEffect, useState, useMemo } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, message, Tag, Select, Divider, Tooltip, Row, Col, Typography, Alert, Badge
} from 'antd';
import { 
  BankOutlined, 
  CopyOutlined, 
  FilterOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { type Property, PropertyService } from '../services/PropertyService';
import { type Theme, ThemeService } from '../services/ThemeService';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const PropertyManager: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [propsData, themesData] = await Promise.all([
        PropertyService.getAll(),
        ThemeService.getAll()
      ]);
      setProperties(propsData);
      setThemes(themesData);
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 获取所有唯一主题用于筛选
  const availableThemes = useMemo(() => {
    const set = new Set(properties.map(p => p.theme));
    return Array.from(set);
  }, [properties]);

  // 过滤后的列表
  const filteredProperties = useMemo(() => {
    if (themeFilter === 'all') return properties;
    return properties.filter(p => p.theme === themeFilter);
  }, [properties, themeFilter]);

  const handleAdd = () => {
    setEditingProperty(null);
    form.resetFields();
    form.setFieldsValue({ 
      theme: themes[0]?.name || '经典', 
      type: 'normal', 
      rentMultipliers: [1, 5, 15, 45, 80, 125] 
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Property) => {
    setEditingProperty(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleClone = (record: Property) => {
    const { id, createdAt, updatedAt, ...cloneData } = record;
    setEditingProperty(null);
    form.setFieldsValue({
      ...cloneData,
      name: `${cloneData.name} (副本)`
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await PropertyService.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingProperty) {
        await PropertyService.update(editingProperty.id, values);
        message.success('更新成功');
      } else {
        await PropertyService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { 
      title: '名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string, record: Property) => (
        <Space>
          <Text strong>{text}</Text>
          {record.description && (
            <Tooltip title={record.description}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    { 
      title: '主题', 
      dataIndex: 'theme', 
      key: 'theme',
      render: (themeName: string) => <Tag color="blue">{themeName}</Tag>
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type: string) => {
        const config: any = {
          normal: { color: 'green', text: '普通土地' },
          station: { color: 'volcano', text: '车站' },
          utility: { color: 'cyan', text: '公共事业' }
        };
        return <Tag color={config[type]?.color}>{config[type]?.text}</Tag>;
      }
    },
    { 
      title: '颜色组', 
      dataIndex: 'colorGroup', 
      key: 'colorGroup',
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, borderRadius: 2, background: color, border: '1px solid #ddd' }} />
          <code>{color}</code>
        </div>
      )
    },
    { title: '价格', dataIndex: 'price', key: 'price', sorter: (a: any, b: any) => a.price - b.price },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Property) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" icon={<CopyOutlined />} onClick={() => handleClone(record)}>克隆</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-content-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>房产库管理</h2>
          <p style={{ color: '#8c8c8c', marginTop: 4 }}>定义全局房产的元数据，支持主题分组与类型扩展。</p>
        </div>
        <Space>
          <Tooltip title={
            <div style={{ padding: '4px' }}>
              <div style={{ marginBottom: '8px' }}><strong>类型说明：</strong></div>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li><strong>普通土地：</strong> 可建造房屋/旅馆，租金随建筑等级提升。</li>
                <li><strong>车站：</strong> 租金取决于玩家拥有的车站总数。</li>
                <li><strong>公共事业：</strong> 租金基于玩家掷出的骰子点数乘以特定倍率。</li>
              </ul>
            </div>
          } overlayInnerStyle={{ width: '300px' }}>
            <Button icon={<QuestionCircleOutlined />}>类型说明</Button>
          </Tooltip>
          <Select 
            value={themeFilter} 
            onChange={setThemeFilter} 
            style={{ width: 120 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">所有主题</Option>
            {availableThemes.map(t => <Option key={t} value={t}>{t}</Option>)}
          </Select>
          <Button type="primary" size="large" icon={<BankOutlined />} onClick={handleAdd}>
            添加新房产
          </Button>
        </Space>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <Alert
          message="房产类型逻辑说明"
          description={
            <Row gutter={16}>
              <Col span={8}>
                <Badge status="success" text="普通土地" style={{ fontWeight: 'bold' }} />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>可购买并建造房屋/旅馆，租金随着建筑等级（0-5级）大幅提升。</div>
              </Col>
              <Col span={8}>
                <Badge status="warning" text="车站" style={{ fontWeight: 'bold' }} />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>不可盖楼。租金根据玩家当前拥有的车站总数（1-4座）成倍增长。</div>
              </Col>
              <Col span={8}>
                <Badge status="processing" text="公共事业" style={{ fontWeight: 'bold' }} />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>电力/自来水厂。租金为 [当前掷出的骰子点数] × [特定倍率]。</div>
              </Col>
            </Row>
          }
          type="info"
          showIcon
          closable
        />
      </div>

      <Table 
        columns={columns} 
        dataSource={filteredProperties} 
        rowKey="id" 
        pagination={{ pageSize: 8 }}
        bordered
      />

      <Modal
        title={editingProperty ? '编辑房产' : '添加房产'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="房产名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="theme" label="所属主题" rules={[{ required: true }]}>
                <Select placeholder="选择主题">
                  {themes.map(t => (
                    <Option key={t.id} value={t.name}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="房产类型" rules={[{ required: true }]}>
                <Select>
                  <Option value="normal">普通土地</Option>
                  <Option value="station">车站</Option>
                  <Option value="utility">公共事业</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="colorGroup" label="颜色组 (Hex码)">
                <Input type="color" style={{ height: 32, padding: 2 }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>经济参数</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label="购买价格" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="houseCost" label="建房费用">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="baseRent" label="基础租金" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="房产背景/描述">
            <TextArea rows={3} placeholder="输入一段有趣的背景故事..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyManager;

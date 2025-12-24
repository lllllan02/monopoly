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
import { type RentLevel, RentLevelService } from '../services/RentLevelService';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

const PropertyManager: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [rentLevels, setRentLevels] = useState<RentLevel[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [propsData, themesData, levelsData] = await Promise.all([
        PropertyService.getAll(),
        ThemeService.getAll(),
        RentLevelService.getAll()
      ]);
      setProperties(propsData);
      setThemes(themesData);
      setRentLevels(levelsData);
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLevelChange = (levelId: string) => {
    // 之前需要同步字段，现在不再需要，因为房产直接引用等级 ID
  };

  // 根据当前表单选择的主题过滤经济等级
  const currentThemeId = Form.useWatch('themeId', form);
  const currentLevelId = Form.useWatch('rentLevelId', form);
  const filteredRentLevels = useMemo(() => {
    return rentLevels.filter(l => l.themeId === currentThemeId);
  }, [rentLevels, currentThemeId]);

  // 获取所有唯一主题用于筛选
  const availableThemes = useMemo(() => {
    return themes.filter(t => properties.some(p => p.themeId === t.id));
  }, [themes, properties]);

  // 过滤后的列表
  const filteredProperties = useMemo(() => {
    if (themeFilter === 'all') return properties;
    return properties.filter(p => p.themeId === themeFilter);
  }, [properties, themeFilter]);

  const handleAdd = () => {
    setEditingProperty(null);
    form.resetFields();
    form.setFieldsValue({ 
      themeId: themes[0]?.id || '', 
      type: 'normal'
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
      dataIndex: 'themeId', 
      key: 'themeId',
      render: (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        return <Tag color="blue">{theme?.name || themeId}</Tag>;
      }
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
      title: '经济等级', 
      dataIndex: 'rentLevelId', 
      key: 'rentLevelId',
      render: (levelId: string, record: Property) => {
        if (record.type !== 'normal') return <Text type="secondary">-</Text>;
        const level = rentLevels.find(l => l.id === levelId);
        if (!level) return <Tag color="warning">未关联等级</Tag>;
        return (
          <Space>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: level.color }} />
            <Text strong>{level.name}</Text>
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Property) => (
        <Space size="middle">
          <Button type="link" style={{ padding: 0 }} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" style={{ padding: 0 }} icon={<CopyOutlined />} onClick={() => handleClone(record)}>克隆</Button>
          <Button type="link" style={{ padding: 0 }} danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <BankOutlined style={{ marginRight: 16, color: '#1890ff' }} />
            房产库管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            定义全局房产的元数据。通过将房产与经济等级模板关联，你可以快速构建具有平衡数值的游戏内容。
          </Typography.Paragraph>
        </div>
        <Space size={12}>
          <Tooltip title={
            <div style={{ padding: '4px' }}>
              <div style={{ marginBottom: '8px' }}><strong>类型说明：</strong></div>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li><strong>普通土地：</strong> 可连续升级建筑，租金随建筑等级提升。</li>
                <li><strong>车站：</strong> 租金取决于玩家拥有的车站总数。</li>
                <li><strong>公共事业：</strong> 租金基于玩家掷出的骰子点数乘以特定倍率。</li>
              </ul>
            </div>
          } overlayInnerStyle={{ width: '300px' }}>
            <Button icon={<QuestionCircleOutlined />} style={{ height: 50, borderRadius: 8 }}>类型说明</Button>
          </Tooltip>
          <Select 
            value={themeFilter} 
            onChange={setThemeFilter} 
            style={{ width: 140, height: 50 }}
            suffixIcon={<FilterOutlined />}
            size="large"
          >
            <Option value="all">所有主题</Option>
            {availableThemes.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
          </Select>
          <Button 
            type="primary" 
            size="large" 
            icon={<BankOutlined />} 
            onClick={handleAdd}
            style={{ 
              borderRadius: '8px', 
              height: '50px', 
              padding: '0 32px', 
              fontSize: '16px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.25)'
            }}
          >
            添加新房产
          </Button>
        </Space>
      </div>
      
      <div style={{ padding: '0 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Alert
            message="房产类型逻辑说明"
          description={
            <Row gutter={16}>
              <Col span={8}>
                <Badge status="success" text="普通土地" style={{ fontWeight: 'bold' }} />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>可购买并连续升级建筑，租金随着建筑等级大幅提升。</div>
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
        bordered={false}
        size="middle"
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
            <Col span={8}>
              <Form.Item name="name" label="房产名称" rules={[{ required: true }]}>
                <Input placeholder="输入房产名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="themeId" label="所属主题" rules={[{ required: true }]}>
                <Select placeholder="选择主题">
                  {themes.map(t => (
                    <Option key={t.id} value={t.id}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="rentLevelId" 
                label="经济等级模板" 
                rules={[{ required: true, message: '普通土地必须关联等级' }]}
              >
                <Select 
                  placeholder={currentThemeId ? "选择该主题下的等级" : "请先选择主题"} 
                  disabled={!currentThemeId}
                >
                  {filteredRentLevels.map(l => (
                    <Option key={l.id} value={l.id}>{l.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="type" label="房产类型" rules={[{ required: true }]}>
                <Select>
                  <Option value="normal">普通土地</Option>
                  <Option value="station">车站</Option>
                  <Option value="utility">公共事业</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="房产背景/描述">
            <TextArea rows={3} placeholder="输入一段有趣的背景故事..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  </div>
);
};

export default PropertyManager;

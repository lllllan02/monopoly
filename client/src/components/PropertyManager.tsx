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
  const currentType = Form.useWatch('type', form);
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
      themeId: themes[0]?.id || ''
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
      title: '经济等级/价格', 
      key: 'priceInfo',
      render: (_: any, record: Property) => {
        if (record.type === 'normal') {
          const level = rentLevels.find(l => l.id === record.rentLevelId);
          if (!level) return <Tag color="warning">未关联等级</Tag>;
          return (
            <Space>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: level.color }} />
              <Text strong>{level.name}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>(¥{level.purchasePrice.toLocaleString()})</Text>
            </Space>
          );
        }
        return <Text strong>¥{record.price?.toLocaleString()}</Text>;
      }
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      width: 120,
      render: (type: string) => {
        const config: any = {
          normal: { color: 'green', text: '普通土地' },
          station: { color: 'volcano', text: '交通枢纽' },
          utility: { color: 'cyan', text: '公用事业' }
        };
        return <Tag color={config[type]?.color}>{config[type]?.text}</Tag>;
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
            定义全局**普通房产**的元数据。通过将房产与经济等级模板关联，你可以快速构建平衡的资产库。车站、公用事业等地块请在“主题管理”中配置。
          </Typography.Paragraph>
        </div>
        <Space size={12}>
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
              <Form.Item name="type" label="房产类型" rules={[{ required: true }]}>
                <Select>
                  <Option value="normal">普通土地</Option>
                  <Option value="station">交通枢纽 (车站)</Option>
                  <Option value="utility">公用事业 (电/水)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {currentType === 'normal' ? (
              <Col span={24}>
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
            ) : (
              <Col span={24}>
                <Form.Item 
                  name="price" 
                  label="地块买入价格" 
                  rules={[{ required: true, message: '请输入价格' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    prefix="¥" 
                    placeholder="例如: 200" 
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="description" label="房产背景/描述">
                <TextArea rows={3} placeholder="输入一段有趣的背景故事..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  </div>
);
};

export default PropertyManager;

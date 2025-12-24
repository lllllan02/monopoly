import React, { useEffect, useState, useMemo } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, message, Tag, Select, Tooltip, Row, Col, Typography, Tabs, Popconfirm
} from 'antd';
import { 
  BankOutlined, 
  CopyOutlined, 
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { type Property, PropertyService } from '../services/PropertyService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';

const { TextArea } = Input;

const PropertyManager: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [rentLevels, setRentLevels] = useState<RentLevel[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [propsData, themesData, levelsData] = await Promise.all([
        PropertyService.getAll().catch(() => [] as Property[]),
        ThemeService.getAll().catch(() => [] as Theme[]),
        RentLevelService.getAll().catch(() => [] as RentLevel[])
      ]);
      setProperties(Array.isArray(propsData) ? propsData : []);
      setThemes(Array.isArray(themesData) ? themesData : []);
      setRentLevels(Array.isArray(levelsData) ? levelsData : []);
      
      if (Array.isArray(themesData) && themesData.length > 0 && !activeThemeId) {
        setActiveThemeId(themesData[0].id);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentThemeId = Form.useWatch('themeId', form);
  const currentType = Form.useWatch('type', form);

  const filteredRentLevels = useMemo(() => {
    return (rentLevels || []).filter(l => l && l.themeId === currentThemeId);
  }, [rentLevels, currentThemeId]);

  const handleAdd = () => {
    setEditingProperty(null);
    form.resetFields();
    form.setFieldsValue({ 
      themeId: activeThemeId || (themes[0]?.id || ''),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      console.error('Delete error:', error);
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
      console.error('Submit error:', error);
      message.error('操作失败');
    }
  };

  const columns = [
    { 
      title: '房产名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string, record: Property) => (
        <Space size={12} style={{ paddingLeft: 16 }}>
          <Typography.Text strong style={{ fontSize: '15px' }}>{text || '未命名'}</Typography.Text>
          {record?.description && (
            <Tooltip title={record.description}>
              <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: '12px' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    { 
      title: '经济等级 / 价格', 
      key: 'priceInfo',
      render: (_: any, record: Property) => {
        if (record?.type === 'normal') {
          const level = (rentLevels || []).find(l => l.id === record.rentLevelId);
          if (!level) return <Typography.Text type="secondary" italic>未关联等级</Typography.Text>;
          return (
            <Space size={12}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: level.color || '#ccc' }} />
              <Typography.Text strong>{level.name || '未知等级'}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>(¥{(level.purchasePrice || 0).toLocaleString()})</Typography.Text>
            </Space>
          );
        }
        return (
          <Space size={8}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>买入价:</Typography.Text>
            <Typography.Text strong>¥{(record?.price || 0).toLocaleString()}</Typography.Text>
          </Space>
        );
      }
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      width: 140,
      render: (type: string) => {
        const config: Record<string, { color: string, text: string }> = {
          normal: { color: 'blue', text: '普通土地' },
          station: { color: 'volcano', text: '交通枢纽' },
          utility: { color: 'cyan', text: '公用事业' }
        };
        const item = config[type] || config.normal;
        return <Tag bordered={false} color={item.color} style={{ borderRadius: '4px' }}>{item.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'right' as const,
      render: (_: any, record: Property) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Tooltip title="克隆房产">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleClone(record)} />
          </Tooltip>
          <Popconfirm 
            title="确定要删除这个房产吗？" 
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <BankOutlined style={{ marginRight: 16, color: '#1890ff' }} />
            房产库管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            在此定义房产的元数据模型。关联经济等级模板后，房产将自动继承其买入价、租金曲线等核心经济规则。
          </Typography.Paragraph>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<PlusOutlined />} 
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
      </div>
      
      <div style={{ padding: '0 40px' }}>
        {themes && themes.length > 0 ? (
          <Tabs 
            activeKey={activeThemeId} 
            onChange={setActiveThemeId}
            type="line"
            size="large"
            tabBarStyle={{ marginBottom: 0, height: '64px' }}
            items={themes.filter(t => t && t.id).map(t => ({
              key: t.id,
              label: (
                <Space size={10} style={{ padding: '0 8px', fontSize: '16px', fontWeight: 500 }}>
                  <BuildOutlined style={{ fontSize: '18px' }} />
                  <span>{t.name}</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '24px 0 40px 0' }}>
                  <Table 
                    columns={columns} 
                    dataSource={(properties || []).filter(p => p && p.themeId === t.id)} 
                    rowKey="id" 
                    bordered={false} 
                    pagination={{ pageSize: 10, showSizeChanger: false }} 
                    size="middle"
                    style={{ width: '100%' }}
                  />
                </div>
              )
            }))}
          />
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#bfbfbf' }}>
            正在加载主题数据...
          </div>
        )}
      </div>

      <Modal
        title={editingProperty ? '编辑房产信息' : '添加新房产'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={640}
        destroyOnClose
        okText="保存信息"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ paddingTop: 20 }}>
          <Row gutter={24}>
            <Col span={14}>
              <Form.Item name="name" label="房产名称" rules={[{ required: true, message: '请输入房产名称' }]}>
                <Input placeholder="例如: 南京路 / 维多利亚港" size="large" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="type" label="房产类型" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="normal">普通土地</Select.Option>
                  <Select.Option value="station">交通枢纽 (车站)</Select.Option>
                  <Select.Option value="utility">公用事业 (电/水)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="themeId" label="所属主题" rules={[{ required: true }]}>
                <Select size="large" placeholder="选择主题">
                  {(themes || []).map(t => (
                    <Select.Option key={t?.id} value={t?.id}>{t?.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {currentType === 'normal' ? (
              <Col span={12}>
                <Form.Item 
                  name="rentLevelId" 
                  label="经济等级模板" 
                  rules={[{ required: true, message: '普通土地必须关联等级' }]}
                >
                  <Select 
                    size="large"
                    placeholder={currentThemeId ? "选择对应等级" : "请先选择主题"} 
                    disabled={!currentThemeId}
                  >
                    {(filteredRentLevels || []).map(l => (
                      <Select.Option key={l?.id} value={l?.id}>{l?.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            ) : (
              <Col span={12}>
                <Form.Item 
                  name="price" 
                  label="买入价格" 
                  rules={[{ required: true, message: '请输入价格' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    size="large"
                    prefix="¥" 
                    placeholder="0" 
                    formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item name="description" label="背景故事 / 描述">
            <TextArea rows={3} placeholder="为这个地块写一段有趣的背景介绍..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyManager;

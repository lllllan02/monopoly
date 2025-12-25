import React, { useEffect, useState, useMemo } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, message, Tag, Select, Tooltip, Row, Col, Typography, Tabs, Popconfirm, Card, Divider, Alert
} from 'antd';
import { 
  BankOutlined, 
  CopyOutlined, 
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  BuildOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { type Property, PropertyService } from '../services/PropertyService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

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
      title: '地块名称', 
      dataIndex: 'name', 
      key: 'name',
      width: 280,
      render: (text: string, record: Property) => (
        <div style={{ paddingLeft: 16 }}>
          <Space size={8} style={{ marginBottom: 4 }}>
            <Typography.Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>{text || '未命名'}</Typography.Text>
            {record?.description && (
              <Tooltip title={record.description}>
                <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: '13px' }} />
              </Tooltip>
            )}
          </Space>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>ID: {record.id}</div>
        </div>
      )
    },
    { 
      title: '类型', 
      key: 'type',
      width: 120,
      render: (_: any, record: Property) => {
        const config: Record<string, { color: string, text: string }> = {
          normal: { color: 'blue', text: '土地' },
          station: { color: 'volcano', text: '车站' },
          utility: { color: 'cyan', text: '公用' },
          start: { color: 'gold', text: '起点' },
          jail: { color: 'red', text: '监狱' },
          fate: { color: 'purple', text: '命运' },
          chance: { color: 'orange', text: '机会' }
        };
        const item = config[record.type] || config.normal;
        return <Tag bordered={false} color={item.color} style={{ borderRadius: '4px', margin: 0, fontSize: '12px', padding: '0 8px' }}>{item.text}</Tag>;
      }
    },
    { 
      title: '收益等级', 
      key: 'rentLevel',
      width: 220,
      render: (_: any, record: Property) => {
        if (record.type !== 'normal') return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
        const level = (rentLevels || []).find(l => l && l.id === record.rentLevelId);
        return level ? (
          <Space size={10}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: level.color || '#ccc' }} />
            <Text style={{ color: '#595959', fontSize: '14px' }}>{level.name}</Text>
          </Space>
        ) : <Text type="secondary" italic style={{ fontSize: '12px' }}>未关联等级</Text>;
      }
    },
    { 
      title: '价格配置 (购买 / 建设)', 
      key: 'prices',
      // 让价格配置作为弹性列，吸收剩余空间，同时设置一个合理的最小宽度
      minWidth: 320,
      render: (_: any, record: Property) => {
        if (!record) return null;
        if (record.type === 'start' || record.type === 'jail' || record.type === 'fate' || record.type === 'chance') {
          const typeMap: Record<string, { color: string, label: string }> = {
            start: { color: 'green', label: '🚩 非售卖资产（奖励点）' },
            jail: { color: 'volcano', label: '🔒 非售卖资产（惩罚点）' },
            fate: { color: 'purple', label: '🔮 非售卖资产（随机事件）' },
            chance: { color: 'orange', label: '🎲 非售卖资产（随机事件）' }
          };
          const config = typeMap[record.type] || typeMap.start;
          return (
            <Tag bordered={false} color={config.color} style={{ borderRadius: '6px', padding: '4px 12px', fontSize: '13px' }}>
              {config.label}
            </Tag>
          );
        }
        if (record.type === 'normal') {
          return (
            <div style={{ 
              display: 'flex', 
              background: '#fafafa', 
              borderRadius: '8px', 
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              width: 'fit-content'
            }}>
              <div style={{ padding: '4px 12px', borderRight: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: '10px', color: '#bfbfbf', display: 'block', lineHeight: 1.2 }}>购买地价</span>
                <Text strong style={{ color: '#fa8c16', fontSize: '14px' }}>¥{(record.price || 0).toLocaleString()}</Text>
              </div>
              <div style={{ padding: '4px 12px', background: '#fff' }}>
                <span style={{ fontSize: '10px', color: '#bfbfbf', display: 'block', lineHeight: 1.2 }}>每级建费</span>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>¥{(record.houseCost || 0).toLocaleString()}</Text>
              </div>
            </div>
          );
        }
        return (
          <div style={{ 
            display: 'inline-flex', 
            flexDirection: 'column',
            padding: '4px 12px',
            background: '#fff7e6', 
            borderRadius: '8px', 
            border: '1px solid #ffd591',
            minWidth: '120px'
          }}>
            <span style={{ fontSize: '10px', color: '#fa8c16', display: 'block', lineHeight: 1.2 }}>资产一口价</span>
            <Text strong style={{ color: '#d46b08', fontSize: '14px' }}>¥{(record.price || 0).toLocaleString()}</Text>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      align: 'right' as const,
      render: (_: any, record: Property) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Tooltip title={record.isDefault ? "内置地块不可克隆" : "克隆地块"}>
            <Button 
              type="text" 
              size="small" 
              icon={<CopyOutlined />} 
              onClick={() => handleClone(record)} 
              disabled={record.isDefault}
            />
          </Tooltip>
          <Popconfirm 
            title="确定要删除这个地块吗？" 
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.isDefault}
          >
            <Tooltip title={record.isDefault ? "系统内置地块不可删除" : ""}>
              <Button 
                type="text" 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                disabled={record.isDefault}
              />
            </Tooltip>
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
            地块管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 800, marginBottom: 0 }}>
            在此定义地图上各种格子的元数据模型。您可以为每个地块（房产、车站、公用事业等）设置独特的价格与背景故事，并关联“经济体系”中的收益规则。
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
          创建新地块
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
                <div style={{ padding: '8px 0 40px 0' }}>
                  <Tabs
                    defaultActiveKey="default"
                    type="card"
                    items={[
                      {
                        key: 'default',
                        label: (
                          <Space>
                            <BankOutlined />
                            <span>系统内置地块</span>
                            <Tag style={{ borderRadius: '10px', marginInlineEnd: 0 }}>
                              {(properties || []).filter(p => p && p.themeId === t.id && p.isDefault).length}
                            </Tag>
                          </Space>
                        ),
                        children: (
                          <div style={{ padding: '16px 0' }}>
                            <Alert
                              message="内置地块说明"
                              description="这些地块是主题的核心组成部分，不可删除或克隆。您可以编辑它们的名称和描述，但类型和归属已被锁定。"
                              type="info"
                              showIcon
                              style={{ marginBottom: 20, borderRadius: '8px' }}
                            />
                            <Table 
                              columns={columns} 
                              dataSource={(properties || []).filter(p => p && p.themeId === t.id && p.isDefault)} 
                              rowKey="id" 
                              bordered={false} 
                              pagination={false}
                              size="middle"
                              style={{ width: '100%' }}
                            />
                          </div>
                        )
                      },
                      {
                        key: 'custom',
                        label: (
                          <Space>
                            <BuildOutlined />
                            <span>自定义扩展地块</span>
                            <Tag color="blue" style={{ borderRadius: '10px', marginInlineEnd: 0 }}>
                              {(properties || []).filter(p => p && p.themeId === t.id && !p.isDefault).length}
                            </Tag>
                          </Space>
                        ),
                        children: (
                          <div style={{ padding: '16px 0' }}>
                            <Table 
                              columns={columns} 
                              dataSource={(properties || []).filter(p => p && p.themeId === t.id && !p.isDefault)} 
                              rowKey="id" 
                              bordered={false} 
                              pagination={{ pageSize: 10, showSizeChanger: false }} 
                              size="middle"
                              style={{ width: '100%' }}
                              locale={{ emptyText: '暂无自定义地块，点击上方“创建新地块”开始添加。' }}
                            />
                          </div>
                        )
                      }
                    ]}
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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 24, background: '#1890ff', borderRadius: 2 }} />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>{editingProperty ? '编辑地块信息' : '创建新地块'}</span>
          </div>
        }
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={720}
        destroyOnClose
        okText="保存配置"
        cancelText="取消"
        styles={{ body: { padding: '24px 32px' } }}
      >
        <Form form={form} layout="vertical">
          {/* 基础信息区域 */}
          <div style={{ marginBottom: 32 }}>
            <Space size={8} style={{ marginBottom: 20 }}>
              <BuildOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
              <Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>核心基础信息</Text>
            </Space>
            
            <Form.Item name="name" label={<span style={{ fontWeight: 600, color: '#595959' }}>地块名称</span>} rules={[{ required: true, message: '请输入地块名称' }]}>
              <Input placeholder="例如: 南京路 / 维多利亚港" size="large" style={{ borderRadius: '8px' }} />
            </Form.Item>
            
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="type" label={<span style={{ fontWeight: 600, color: '#595959' }}>地块功能类型</span>} rules={[{ required: true }]}>
                  <Select 
                    size="large" 
                    style={{ borderRadius: '8px' }}
                    disabled={true} // 全面禁止手动修改地块类型
                  >
                    <Select.Option value="normal">🏠 普通土地 (可盖楼)</Select.Option>
                    <Select.Option value="station">🚂 交通枢纽 (车站)</Select.Option>
                    <Select.Option value="utility">💡 公用事业 (水/电)</Select.Option>
                    <Select.Option value="jail">🚔 监狱 (违规禁足)</Select.Option>
                    <Select.Option value="fate">🔮 命运 (随机事件)</Select.Option>
                    <Select.Option value="chance">🎲 机会 (随机事件)</Select.Option>
                    <Select.Option value="start">🚩 起点 (系统预设)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="themeId" label={<span style={{ fontWeight: 600, color: '#595959' }}>所属游戏主题</span>} rules={[{ required: true }]}>
                  <Select 
                    size="large" 
                    placeholder="选择地块所属主题" 
                    style={{ borderRadius: '8px' }}
                    disabled={!!editingProperty}
                  >
                    {(themes || []).map(t => (
                      <Select.Option key={t?.id} value={t?.id}>{t?.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: '0 0 32px 0', borderStyle: 'dashed' }} />

          {/* 经济参数区域 */}
          <div style={{ marginBottom: 32 }}>
            <Space size={8} style={{ marginBottom: 20 }}>
              <BankOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />
              <Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>经济体系设定</Text>
            </Space>

            {currentType === 'normal' ? (
              <div style={{ padding: '24px', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '12px' }}>
                <Row gutter={20}>
                  <Col span={24}>
                    <Form.Item 
                      name="rentLevelId" 
                      label={<span style={{ fontWeight: 600, color: '#595959' }}>租金收益等级模板</span>} 
                      rules={[{ required: true, message: '普通土地必须关联等级' }]}
                      extra={<Text type="secondary" style={{ fontSize: '12px' }}>决定该地块的租金回报率曲线</Text>}
                    >
                      <Select 
                        size="large"
                        placeholder={currentThemeId ? "请选择一个收益模板" : "请先在上文中选择主题"} 
                        disabled={!currentThemeId}
                        style={{ borderRadius: '8px' }}
                      >
                        {(filteredRentLevels || []).map(l => (
                          <Select.Option key={l?.id} value={l?.id}>
                            <Space>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                              <Text strong>{l?.name}</Text>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={20}>
                  <Col span={12}>
                    <Form.Item 
                      name="price" 
                      label={<span style={{ fontWeight: 600, color: '#595959' }}>购买土地价格</span>} 
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
                  <Col span={12}>
                    <Form.Item 
                      name="houseCost" 
                      label={<span style={{ fontWeight: 600, color: '#595959' }}>单级建设费用</span>} 
                      rules={[{ required: true, message: '请输入费用' }]}
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
                </Row>
              </div>
            ) : (currentType === 'start' || currentType === 'jail' || currentType === 'fate' || currentType === 'chance') ? (
              <div style={{ padding: '24px', background: (currentType === 'start' || currentType === 'fate' || currentType === 'chance') ? '#f6ffed' : '#fff1f0', border: `1px solid ${(currentType === 'start' || currentType === 'fate' || currentType === 'chance') ? '#b7eb8f' : '#ffa39e'}`, borderRadius: '12px' }}>
                <Text type="secondary">
                  {currentType === 'start' ? (
                    <>起点地块无需设置独立价格。路过奖励已在 <Text strong style={{ color: '#52c41a' }}>[经济体系] - [核心规则配置]</Text> 中全局定义。</>
                  ) : currentType === 'jail' ? (
                    <>监狱地块无需设置价格。保释金与关押时长已在 <Text strong style={{ color: '#ff4d4f' }}>[经济体系] - [核心规则配置]</Text> 中全局定义。</>
                  ) : (
                    <>{currentType === 'fate' ? '命运' : '机会'}点无需设置价格。卡组逻辑将在 <Text strong style={{ color: '#52c41a' }}>[命运/机会卡]</Text> 模块中统一管理。</>
                  )}
                </Text>
              </div>
            ) : (
              <div style={{ padding: '24px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '12px' }}>
                <Form.Item 
                  name="price" 
                  label={<span style={{ fontWeight: 600, color: '#fa8c16' }}>该地块买入一口价 (¥)</span>} 
                  rules={[{ required: true, message: '请输入价格' }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    size="large"
                    prefix="¥" 
                    placeholder="0"
                    formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  />
                </Form.Item>
                <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: 12, opacity: 0.8 }}>
                  提示：特殊地块不具备建设升级功能，租金将根据“经济体系”中的全局规则计算。
                </div>
              </div>
            )}
          </div>

          {/* 描述区域 */}
          <Form.Item name="description" label={<span style={{ fontWeight: 600, color: '#595959' }}>背景故事 / 地块描述</span>}>
            <TextArea 
              rows={4} 
              placeholder="为这个地块写一段有趣的背景介绍，增加代入感... (可选)" 
              style={{ borderRadius: '12px', padding: '12px' }} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyManager;

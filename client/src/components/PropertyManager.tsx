import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, Tag, Select, Tooltip, Row, Col, Typography, Tabs, Popconfirm, Divider, Alert, Segmented, App
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

const { Text } = Typography;

const PropertyManager: React.FC = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [rentLevels, setRentLevels] = useState<RentLevel[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<string>('default');
  const [filterLevelId, setFilterLevelId] = useState<string>('all');
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
      
      // 优先从路由状态中获取初始主题和子页签
      const state = location.state as { themeId?: string, tab?: string };
      if (state?.themeId) {
        setActiveThemeId(state.themeId);
        if (state.tab) setActiveSubTab(state.tab);
      } else if (Array.isArray(themesData) && themesData.length > 0 && !activeThemeId) {
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

  useEffect(() => {
    setFilterLevelId('all');
  }, [activeThemeId]);

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
    // 如果 icon 是字符串，转为数组以适配 Select mode="tags"
    const formValues = {
      ...record,
      icon: record.icon ? (Array.isArray(record.icon) ? record.icon : [record.icon]) : []
    };
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleClone = (record: Property) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...cloneData } = record;
    setEditingProperty(null);
    // 如果 icon 是字符串，转为数组以适配 Select mode="tags"
    const formValues = {
      ...cloneData,
      icon: cloneData.icon ? (Array.isArray(cloneData.icon) ? cloneData.icon : [cloneData.icon]) : [],
      name: `${cloneData.name} (副本)`
    };
    form.setFieldsValue(formValues);
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
      
      // 处理 icon 字段：如果 mode="tags" 返回的是数组，则取第一个元素转为字符串
      const processedValues = {
        ...values,
        icon: Array.isArray(values.icon) ? values.icon[0] : values.icon
      };

      if (editingProperty) {
        await PropertyService.update(editingProperty.id, processedValues);
        message.success('更新成功');
      } else {
        await PropertyService.create(processedValues);
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
          </Space>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>ID: {record.id}</div>
        </div>
      )
    },
    { 
      title: '视觉标识', 
      key: 'visual',
      width: 100,
      render: (_: any, record: Property) => {
        // 只有内置/特殊类型的地块显示图标，普通土地不显示图标选择
        if (record.type === 'normal') return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;

        const iconValue = Array.isArray(record.icon) ? record.icon[0] : record.icon;
        const isUrl = iconValue && (iconValue.startsWith('http') || iconValue.startsWith('/') || iconValue.startsWith('data:'));
        
        return (
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: '#f5f5f5', 
            borderRadius: '8px', 
            padding: '4px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '20px',
            border: '1px solid #e8e8e8',
            overflow: 'hidden'
          }}>
            {isUrl ? (
              <img src={iconValue} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="logo" />
            ) : iconValue && iconValue.trim().startsWith('<svg') ? (
              <div 
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: iconValue }}
              />
            ) : (
              iconValue || '🔲'
            )}
          </div>
        );
      }
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
            在此定义地图上各种格子的元数据模型。您可以为每个地块（房产、车站、公用事业等）设置独特的价格，并关联“经济体系”中的收益规则。
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
            fontWeight: 600
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
                    activeKey={activeSubTab}
                    onChange={setActiveSubTab}
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
                              description="这些地块是主题的核心组成部分，不可删除或克隆。您可以编辑它们的名称，但类型和归属已被锁定。"
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
                            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ fontSize: '13px', color: '#8c8c8c' }}>收益等级筛选:</span>
                              <Segmented
                                value={filterLevelId}
                                onChange={(val) => setFilterLevelId(val as string)}
                                options={[
                                  { label: '全部地块', value: 'all' },
                                  ...(rentLevels || [])
                                    .filter(l => l && l.themeId === t.id)
                                    .map(l => ({
                                      label: (
                                        <Space size={4}>
                                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                                          <span>{l.name}</span>
                                        </Space>
                                      ),
                                      value: l.id
                                    }))
                                ]}
                              />
                            </div>
                            <Table 
                              columns={columns} 
                              dataSource={(properties || [])
                                .filter(p => p && p.themeId === t.id && !p.isDefault)
                                .filter(p => filterLevelId === 'all' || p.rentLevelId === filterLevelId)
                              } 
                              rowKey="id" 
                              bordered={false} 
                              pagination={{ pageSize: 10, showSizeChanger: false }} 
                              size="middle"
                              style={{ width: '100%' }}
                              locale={{ emptyText: '暂无符合条件的自定义地块。' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 18, background: '#1890ff', borderRadius: 2 }} />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>{editingProperty ? '编辑地块信息' : '创建新地块'}</span>
          </div>
        }
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={560}
        destroyOnClose
        okText="保存配置"
        cancelText="取消"
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Form form={form} layout="vertical">
          {/* 基础信息区域 */}
          <div style={{ marginBottom: 24 }}>
            <Space size={8} style={{ marginBottom: 16 }}>
              <BuildOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
              <Text strong style={{ fontSize: '14px', color: '#1a1a1a' }}>基础配置</Text>
            </Space>
            
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="name" label={<span style={{ fontWeight: 600, color: '#595959' }}>地块名称</span>} rules={[{ required: true, message: '请输入地块名称' }]}>
                  <Input placeholder="例如: 南京路 / 维多利亚港" style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label={<span style={{ fontWeight: 600, color: '#595959' }}>功能类型</span>} rules={[{ required: true }]}>
                  <Select 
                    style={{ borderRadius: '6px' }}
                    disabled={true}
                  >
                    <Select.Option value="normal">🏠 普通土地</Select.Option>
                    <Select.Option value="station">🚂 交通枢纽</Select.Option>
                    <Select.Option value="utility">💡 公用事业</Select.Option>
                    <Select.Option value="jail">🚔 监狱禁足</Select.Option>
                    <Select.Option value="fate">🔮 命运事件</Select.Option>
                    <Select.Option value="chance">🎲 机会事件</Select.Option>
                    <Select.Option value="start">🚩 起点预设</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="themeId" label={<span style={{ fontWeight: 600, color: '#595959' }}>所属主题</span>} rules={[{ required: true }]}>
                  <Select 
                    placeholder="选择游戏主题" 
                    style={{ borderRadius: '6px' }}
                    disabled={!!editingProperty}
                  >
                    {(themes || []).map(t => (
                      <Select.Option key={t?.id} value={t?.id}>{t?.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {currentType !== 'normal' && (
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item 
                    name="icon" 
                    label={<span style={{ fontWeight: 600, color: '#595959' }}>展示图标</span>} 
                    rules={[{ required: currentType !== 'normal', message: '请选择或输入图标' }]}
                  >
                    <Select 
                      mode="tags"
                      maxCount={1}
                      style={{ borderRadius: '6px' }} 
                      placeholder="选一个图标或输入 URL"
                    >
                      <Select.OptGroup label="内置地块 - 指定图案">
                        {currentType === 'start' && <Select.Option value="/icons/start.svg">🚩 起点 (Start)</Select.Option>}
                        {currentType === 'jail' && <Select.Option value="/icons/jail.svg">🚔 监狱 (Jail)</Select.Option>}
                        {currentType === 'fate' && <Select.Option value="/icons/fate.svg">🔮 命运 (Fate)</Select.Option>}
                        {currentType === 'chance' && <Select.Option value="/icons/chance.svg">🎲 机会 (Chance)</Select.Option>}
                        {currentType === 'station' && <Select.Option value="/icons/station.svg">🚂 车站 (Station)</Select.Option>}
                        {currentType === 'utility' && (
                          <>
                            <Select.Option value="/icons/utility_power.svg">⚡ 电力 (Power)</Select.Option>
                            <Select.Option value="/icons/utility_water.svg">💧 水厂 (Water)</Select.Option>
                          </>
                        )}
                      </Select.OptGroup>
                      <Select.OptGroup label="自定义">
                        <Select.Option value="🏢">🏢 默认楼宇</Select.Option>
                        <Select.Option value="🌳">🌳 公园绿地</Select.Option>
                      </Select.OptGroup>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
          </div>

          <Divider style={{ margin: '0 0 20px 0', borderStyle: 'dashed' }} />

          {/* 经济参数区域 */}
          <div style={{ marginBottom: 8 }}>
            <Space size={8} style={{ marginBottom: 16 }}>
              <BankOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
              <Text strong style={{ fontSize: '14px', color: '#1a1a1a' }}>经济体系</Text>
            </Space>

            {currentType === 'normal' ? (
              <>
                <Form.Item 
                  name="rentLevelId" 
                  label={<span style={{ fontWeight: 600, color: '#595959' }}>租金收益等级模板</span>} 
                  rules={[{ required: true, message: '普通土地必须关联等级' }]}
                  extra={<Text type="secondary" style={{ fontSize: '11px' }}>决定该地块的租金回报率曲线</Text>}
                >
                  <Select 
                    placeholder={currentThemeId ? "请选择收益模板" : "请先选择主题"} 
                    disabled={!currentThemeId}
                    style={{ borderRadius: '6px' }}
                  >
                    {(filteredRentLevels || []).map(l => (
                      <Select.Option key={l?.id} value={l?.id}>
                        <Space>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                          <Text>{l?.name}</Text>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="price" 
                      label={<span style={{ fontWeight: 600, color: '#595959' }}>土地价格</span>} 
                      rules={[{ required: true, message: '请输入价格' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%', borderRadius: '6px' }} 
                        prefix="$" 
                        placeholder="0"
                        formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="houseCost" 
                      label={<span style={{ fontWeight: 600, color: '#595959' }}>建设费用</span>} 
                      rules={[{ required: true, message: '请输入费用' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%', borderRadius: '6px' }} 
                        prefix="$" 
                        placeholder="0"
                        formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ) : (currentType === 'start' || currentType === 'jail' || currentType === 'fate' || currentType === 'chance') ? (
              <div style={{ padding: '16px', background: (currentType === 'start' || currentType === 'fate' || currentType === 'chance') ? '#f6ffed' : '#fff1f0', border: `1px solid ${(currentType === 'start' || currentType === 'fate' || currentType === 'chance') ? '#b7eb8f' : '#ffa39e'}`, borderRadius: '8px' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  {currentType === 'start' ? '起点地块路过奖励已在[经济体系]中全局定义。' : 
                   currentType === 'jail' ? '监狱保释金与时长已在[经济体系]中全局定义。' : 
                   '该事件点逻辑将在[卡组管理]中统一管理。'}
                </Text>
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '8px' }}>
                <Form.Item 
                  name="price" 
                  label={<span style={{ fontWeight: 600, color: '#fa8c16' }}>该地块买入一口价 ($)</span>} 
                  rules={[{ required: true, message: '请输入价格' }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber 
                    style={{ width: '100%', borderRadius: '6px' }} 
                    prefix="$" 
                    placeholder="0"
                    formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  />
                </Form.Item>
              </div>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyManager;

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, Popconfirm, Divider, Select, Tag, 
  Row, Col, Typography, Tabs, Card, Tooltip, Switch, App
} from 'antd';
import { 
  PercentageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  BuildOutlined,
  RocketOutlined,
  BankOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';
import { type Theme, ThemeService } from '../services/ThemeService';

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

const EconomicManager: React.FC = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const [levels, setLevels] = useState<RentLevel[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<RentLevel | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [form] = Form.useForm();
  const [themeForm] = Form.useForm();

  const fetchData = async () => {
    try {
      const [levelsData, themesData] = await Promise.all([
        RentLevelService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => [])
      ]);
      setLevels(Array.isArray(levelsData) ? levelsData : []);
      setThemes(Array.isArray(themesData) ? themesData : []);
      
      const state = location.state as { themeId?: string };
      if (state?.themeId) {
        setActiveThemeId(state.themeId);
      } else if (Array.isArray(themesData) && themesData.length > 0 && !activeThemeId) {
        setActiveThemeId(themesData[0].id);
      }
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 当切换主题页签时，同步主题规则表单
  useEffect(() => {
    const currentTheme = themes.find(t => t.id === activeThemeId);
    if (currentTheme) {
      themeForm.setFieldsValue({
        stationRent: currentTheme.stationRent || [25, 50, 100, 200],
        utilityMultipliers: currentTheme.utilityMultipliers || [4, 10],
        goReward: currentTheme.goReward || 200,
        jailRules: currentTheme.jailRules || {
          bailAmount: 50,
          maxTurns: 3,
          allowDoubles: true
        }
      });
    }
  }, [activeThemeId, themes, themeForm]);

  const filteredLevels = useMemo(() => {
    return levels.filter(l => l && l.themeId === activeThemeId);
  }, [levels, activeThemeId]);

  const handleAdd = () => {
    setEditingLevel(null);
    form.resetFields();
    form.setFieldsValue({ 
      themeId: activeThemeId,
      color: '#1890ff',
      maxHouses: 5,
      rentCurve: [0, 0, 0, 0, 0, 0] 
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: RentLevel) => {
    setEditingLevel(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingLevel) {
        await RentLevelService.update(editingLevel.id, values);
        message.success('修改成功');
      } else {
        await RentLevelService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSaveThemeRules = async () => {
    try {
      const values = await themeForm.validateFields();
      const currentTheme = themes.find(t => t.id === activeThemeId);
      if (currentTheme) {
        await ThemeService.update(currentTheme.id, {
          ...currentTheme,
          ...values
        });
        message.success('规则已保存');
        fetchData();
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const maxHouses = Form.useWatch('maxHouses', form);
  useEffect(() => {
    if (maxHouses !== undefined) {
      const currentCurve = form.getFieldValue('rentCurve') || [];
      const targetLen = maxHouses + 1;
      if (currentCurve.length !== targetLen) {
        const newCurve = [...currentCurve];
        if (newCurve.length > targetLen) {
          newCurve.splice(targetLen);
        } else {
          while (newCurve.length < targetLen) {
            newCurve.push(0);
          }
        }
        form.setFieldsValue({ rentCurve: newCurve });
      }
    }
  }, [maxHouses, form]);

  const columns = [
    { 
      title: '等级模板', 
      key: 'info', 
      width: 280,
      render: (record: RentLevel) => (
        <Space size={12} style={{ paddingLeft: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: record.color, boxShadow: '0 0 4px rgba(0,0,0,0.1)' }} />
          <Text strong style={{ fontSize: '15px', color: '#1a1a1a' }}>{record.name}</Text>
        </Space>
      )
    },
    { 
      title: '租金阶梯收益 (基准 → 满级)', 
      dataIndex: 'rentCurve', 
      key: 'rentCurve',
      render: (curve: number[]) => {
        const maxVal = Math.max(...(curve || [1]), 1);
        const totalSlots = 6;
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: 10, 
            height: 54, 
            padding: '6px 0',
            width: '100%',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: '1px', background: '#f5f5f5' }} />
            
            {(curve || []).map((val, i) => {
              const height = Math.max(18, (val / maxVal) * 48); 
              const isMax = i === (curve?.length || 0) - 1;
              const isEmptyLand = i === 0;
              
              let bgColor = '#e6f7ff';
              let borderColor = '#bae7ff';
              let textColor = '#1890ff';

              if (isMax) {
                bgColor = '#1890ff';
                borderColor = 'none';
                textColor = '#fff';
              } else if (isEmptyLand) {
                bgColor = '#fff7e6';
                borderColor = '#ffe7ba';
                textColor = '#fa8c16';
              }

              return (
                <Tooltip key={i} title={`${i === 0 ? '地块租金' : `建筑 ${i}级`}: ¥${(val || 0).toLocaleString()}`}>
                  <div style={{ 
                    flex: 1,
                    background: bgColor,
                    height: `${height}px`,
                    borderRadius: '6px 6px 2px 2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1,
                    transition: 'all 0.2s',
                    border: borderColor === 'none' ? 'none' : `1px solid ${borderColor}`,
                    borderBottom: 'none'
                  }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: textColor, 
                      fontWeight: 600,
                    }}>
                      {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
            {Array.from({ length: totalSlots - (curve?.length || 0) }).map((_, i) => (
              <div key={`placeholder-${i}`} style={{ flex: 1, height: '1px', background: 'transparent' }} />
            ))}
          </div>
        );
      }
    },
    { 
      title: '等级上限', 
      dataIndex: 'maxHouses', 
      key: 'maxHouses', 
      width: 100,
      render: (val: number) => (
        <div>
          <Text strong style={{ fontSize: '18px', color: '#595959' }}>{val}</Text>
          <span style={{ fontSize: '12px', color: '#bfbfbf', marginLeft: 4 }}>级</span>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: RentLevel) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定要删除吗？" onConfirm={() => RentLevelService.delete(record.id).then(fetchData)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <PercentageOutlined style={{ marginRight: 16, color: '#fa8c16' }} />
            经济体系管理
          </Title>
          <Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 800, marginBottom: 0 }}>
            在此统一定义游戏的经济平衡规则。包含土地分级模板以及车站、公用事业、监狱等特殊资产的收益与惩罚系数。
          </Paragraph>
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
          添加土地等级
        </Button>
      </div>

      <div style={{ padding: '0 40px' }}>
        <Tabs 
          activeKey={activeThemeId} 
          onChange={setActiveThemeId}
          type="line"
          size="large"
          tabBarStyle={{ marginBottom: 0, height: '64px' }}
          items={themes.map(t => ({
            key: t.id,
            label: (
              <Space size={10} style={{ padding: '0 8px', fontSize: '16px', fontWeight: 500 }}>
                <BuildOutlined style={{ fontSize: '18px' }} />
                <span>{t.name}</span>
              </Space>
            ),
            children: (
              <div style={{ padding: '24px 0 40px 0' }}>
                {/* 顶部规则区域 */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Space size={8}>
                      <div style={{ width: 4, height: 18, background: '#fa8c16', borderRadius: 2 }} />
                      <Text strong style={{ fontSize: '16px' }}>特殊地块规则设定</Text>
                      <Tooltip title="此处配置车站租金、公用事业倍率以及监狱处罚规则。这些规则随主题全局生效。">
                        <InfoCircleOutlined style={{ color: '#bfbfbf' }} />
                      </Tooltip>
                    </Space>
                    <Button 
                      type="primary" 
                      ghost 
                      size="small" 
                      icon={<SaveOutlined />} 
                      onClick={handleSaveThemeRules}
                    >
                      保存所有规则修改
                    </Button>
                  </div>
                  
                  <Form form={themeForm} layout="vertical">
                    <Row gutter={24}>
                      {/* 1. 起点规则 */}
                      <Col span={6}>
                        <Card size="small" title={<Space><RocketOutlined style={{ color: '#fa8c16' }} /><span>起点奖励金额</span></Space>} style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '12px', height: '100%' }}>
                          <Form.Item name="goReward" label={<span style={{ fontSize: '11px', color: '#8c8c8c' }}>路过奖励</span>} style={{ marginBottom: 0 }}>
                            <InputNumber 
                              style={{ width: '100%', borderRadius: '6px' }} 
                              prefix="¥" 
                              controls={false}
                              placeholder="200"
                              formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                            />
                          </Form.Item>
                          <div style={{ fontSize: '11px', color: '#52c41a', marginTop: 8, opacity: 0.8 }}>
                            玩家每次路过起点领取的现金。
                          </div>
                        </Card>
                      </Col>

                      {/* 2. 监狱规则 */}
                      <Col span={6}>
                        <Card size="small" title={<Space><SecurityScanOutlined style={{ color: '#ff4d4f' }} /><span>监狱/拘留规则</span></Space>} style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '12px', height: '100%' }}>
                          <Space direction="vertical" style={{ width: '100%' }} size={4}>
                            <Row gutter={8}>
                              <Col span={12}>
                                <Form.Item name={['jailRules', 'bailAmount']} label={<span style={{ fontSize: '11px', color: '#8c8c8c' }}>保释金</span>} style={{ marginBottom: 0 }}>
                                  <InputNumber style={{ width: '100%', borderRadius: '6px' }} prefix="¥" controls={false} />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item name={['jailRules', 'maxTurns']} label={<span style={{ fontSize: '11px', color: '#8c8c8c' }}>最大回合</span>} style={{ marginBottom: 0 }}>
                                  <InputNumber style={{ width: '100%', borderRadius: '6px' }} suffix="轮" controls={false} />
                                </Form.Item>
                              </Col>
                            </Row>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <span style={{ fontSize: '11px', color: '#8c8c8c' }}>允许双数出狱</span>
                              <Form.Item name={['jailRules', 'allowDoubles']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                <Switch size="small" />
                              </Form.Item>
                            </div>
                          </Space>
                        </Card>
                      </Col>

                      {/* 3. 车站规则 */}
                      <Col span={6}>
                        <Card size="small" title={<Space><RocketOutlined style={{ color: '#fa8c16' }} /><span>车站租金梯队</span></Space>} style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '12px', height: '100%' }}>
                          <Form.List name="stationRent">
                            {(fields) => (
                              <Row gutter={8}>
                                {fields.map((field, index) => (
                                  <Col span={12} key={field.key}>
                                    <Form.Item 
                                      {...field} 
                                      label={<span style={{ fontSize: '11px', color: '#8c8c8c' }}>{index + 1}座时</span>}
                                      style={{ marginBottom: 4 }}
                                    >
                                      <InputNumber 
                                        style={{ width: '100%', borderRadius: '6px' }} 
                                        prefix="¥" 
                                        controls={false}
                                      />
                                    </Form.Item>
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </Form.List>
                        </Card>
                      </Col>

                      {/* 4. 公用事业规则 */}
                      <Col span={6}>
                        <Card size="small" title={<Space><BankOutlined style={{ color: '#13c2c2' }} /><span>公用事业倍率</span></Space>} style={{ background: '#e6fffb', border: '1px solid #87e8de', borderRadius: '12px', height: '100%' }}>
                          <Form.List name="utilityMultipliers">
                            {(fields) => (
                              <Row gutter={8}>
                                {fields.map((field, index) => (
                                  <Col span={12} key={field.key}>
                                    <Form.Item 
                                      {...field} 
                                      label={<span style={{ fontSize: '11px', color: '#8c8c8c' }}>{index + 1}个时</span>}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <InputNumber 
                                        style={{ width: '100%', borderRadius: '6px' }} 
                                        prefix="×" 
                                        controls={false}
                                      />
                                    </Form.Item>
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </Form.List>
                        </Card>
                      </Col>
                    </Row>
                  </Form>
                </div>

                <Divider style={{ margin: '32px 0' }} />

                {/* 土地等级列表 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 4, height: 18, background: '#1890ff', borderRadius: 2 }} />
                  <Text strong style={{ fontSize: '16px' }}>土地经济等级模板</Text>
                </div>
                
                <Table 
                  columns={columns} 
                  dataSource={filteredLevels} 
                  rowKey="id" 
                  bordered={false} 
                  pagination={false} 
                  size="middle"
                  style={{ width: '100%' }}
                  locale={{ emptyText: '当前主题下暂无配置，请点击右上方按钮开始创建' }}
                />
              </div>
            )
          }))}
        />
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 24, background: '#1890ff', borderRadius: 2 }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{editingLevel ? '编辑土地等级' : '创建新土地等级'}</span>
          </div>
        }
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={640}
        destroyOnClose
        okText="保存配置"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ paddingTop: 20 }}>
          <Row gutter={24}>
            <Col span={14}>
              <Form.Item name="name" label={<span style={{ fontWeight: 600 }}>等级名称</span>} rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如: 核心商务区 / 高端住宅" size="large" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="color" label={<span style={{ fontWeight: 600 }}>视觉标识色</span>} rules={[{ required: true }]}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Input type="color" style={{ width: 64, height: 40, padding: 2, borderRadius: '4px' }} />
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>用于棋盘格子<br/>与资产卡片</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="themeId" label={<span style={{ fontWeight: 600 }}>所属主题</span>} rules={[{ required: true }]}>
                <Select size="large" placeholder="请选择主题">
                  {themes.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxHouses" label={<span style={{ fontWeight: 600 }}>建设等级上限</span>} rules={[{ required: true }]}>
                <Select size="large">
                  {[1,2,3,4,5].map(v => <Option key={v} value={v}>{v} 级建筑</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Divider orientation="left" plain><Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>核心经济数值</Text></Divider>
          
          <Card 
            title={<span style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: 500 }}>租金收益梯度 (地块 → 1级 → ... → 满级)</span>} 
            size="small" 
            style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '8px' }}
            bodyStyle={{ padding: '20px 16px' }}
          >
            <Form.List name="rentCurve">
              {(fields) => (
                <Row gutter={[12, 12]}>
                  {fields.map((field, index) => (
                    <Col span={index === fields.length - 1 ? 6 : 4} key={field.key}>
                      <Form.Item
                        {...field}
                        label={<span style={{ fontSize: '12px', color: '#595959' }}>{index === 0 ? '地块' : `${index}级`}</span>}
                        rules={[{ required: true, message: '' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber 
                          style={{ 
                            width: '100%', 
                            borderRadius: '4px',
                            borderColor: index === fields.length - 1 ? '#ff4d4f' : undefined 
                          }} 
                          controls={false}
                          placeholder="0"
                        />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default EconomicManager;

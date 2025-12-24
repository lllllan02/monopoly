import React, { useEffect, useState, useMemo } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, message, Popconfirm, Divider, Select, Tag, 
  Row, Col, Typography, Tabs, Card, Statistic, Tooltip
} from 'antd';
import { 
  PercentageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';
import { type Theme, ThemeService } from '../services/ThemeService';

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

const RentLevelManager: React.FC = () => {
  const [levels, setLevels] = useState<RentLevel[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<RentLevel | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [levelsData, themesData] = await Promise.all([
        RentLevelService.getAll(),
        ThemeService.getAll()
      ]);
      setLevels(levelsData);
      setThemes(themesData);
      if (themesData.length > 0 && !activeThemeId) {
        setActiveThemeId(themesData[0].id);
      }
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLevels = useMemo(() => {
    return levels.filter(l => l.themeId === activeThemeId);
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
      width: 180,
      render: (record: RentLevel) => (
        <Space size={12} style={{ paddingLeft: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: record.color, boxShadow: '0 0 4px rgba(0,0,0,0.1)' }} />
          <Text strong style={{ fontSize: '15px', color: '#1a1a1a' }}>{record.name}</Text>
        </Space>
      )
    },
    { 
      title: '价格配置 (购买 / 建设)', 
      key: 'cost', 
      width: 240,
      render: (record: RentLevel) => (
        <Space size={16}>
          <div style={{ fontSize: '14px' }}>
            <span style={{ color: '#8c8c8c', marginRight: 4 }}>购买: </span>
            <Text strong>¥{record.purchasePrice.toLocaleString()}</Text>
          </div>
          <div style={{ fontSize: '14px' }}>
            <span style={{ color: '#8c8c8c', marginRight: 4 }}>建费: </span>
            <Text strong>¥{record.houseCost.toLocaleString()}</Text>
          </div>
        </Space>
      )
    },
    { 
      title: '租金阶梯收益 (基准 → 满级)', 
      dataIndex: 'rentCurve', 
      key: 'rentCurve',
      render: (curve: number[]) => {
        const maxVal = Math.max(...curve, 1);
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
            
            {curve?.map((val, i) => {
              const height = Math.max(18, (val / maxVal) * 48); 
              const isMax = i === curve.length - 1;
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
                <Tooltip key={i} title={`${i === 0 ? '地块租金' : `建筑 ${i}级`}: ¥${val.toLocaleString()}`}>
                  <div className="rent-bar-hover" style={{ 
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
                      opacity: isMax ? 0.95 : 1
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
            经济数值模板
          </Title>
          <Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            在此统一定义地段的经济平衡规则。所有房产库的地块将引用这些模板，以确保全局数值梯度的严谨与统一。
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
          创建新模板
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
                <Table 
                  columns={columns} 
                  dataSource={filteredLevels} 
                  rowKey="id" 
                  bordered={false} 
                  pagination={false} 
                  size="middle"
                  style={{ width: '100%' }}
                  locale={{ emptyText: '当前主题下暂无配置，请点击上方按钮开始创建' }}
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
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{editingLevel ? '编辑配置模板' : '创建新经济模板'}</span>
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
              <Form.Item name="name" label={<span style={{ fontWeight: 600 }}>模板名称</span>} rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如: 核心商务区 / 高端住宅" size="large" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="color" label={<span style={{ fontWeight: 600 }}>视觉标识色</span>} rules={[{ required: true }]}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Input type="color" style={{ width: 64, height: 40, padding: 2, borderRadius: '4px' }} />
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>用于棋盘地块<br/>与房产卡片</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="themeId" label={<span style={{ fontWeight: 600 }}>所属游戏主题</span>} rules={[{ required: true }]}>
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
          
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="purchasePrice" label={<span style={{ fontWeight: 600 }}>购买土地价格</span>} rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: '100%' }} 
                  size="large" 
                  prefix="¥" 
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="houseCost" label={<span style={{ fontWeight: 600 }}>单级建筑费用</span>} rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: '100%' }} 
                  size="large" 
                  prefix="¥"
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

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

export default RentLevelManager;

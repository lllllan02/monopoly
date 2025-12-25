import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, 
  Space, Tag, Select, Typography, 
  Popconfirm, Row, Col, Divider, InputNumber, Tabs, Tooltip, Segmented, App
} from 'antd';
import { 
  IdcardOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  InfoCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { type Card, CardService } from '../services/CardService';
import { type Property, PropertyService } from '../services/PropertyService';
import { type Theme, ThemeService } from '../services/ThemeService';

const { TextArea } = Input;
const { Text } = Typography;

const CardManager: React.FC = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const [cards, setCards] = useState<Card[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [cardsData, themesData, propsData] = await Promise.all([
        CardService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => [])
      ]);
      setCards(Array.isArray(cardsData) ? cardsData : []);
      setThemes(Array.isArray(themesData) ? themesData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);

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

  useEffect(() => {
    setFilterType('all');
    setFilterAction('all');
  }, [activeThemeId]);

  const handleAdd = () => {
    setEditingCard(null);
    form.resetFields();
    form.setFieldsValue({ 
      themeId: activeThemeId,
      type: 'chance', 
      action: 'add_money', 
      params: {} 
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Card) => {
    setEditingCard(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await CardService.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingCard) {
        await CardService.update(editingCard.id, values);
        message.success('修改成功');
      } else {
        await CardService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const actionType = Form.useWatch('action', form);
  const currentThemeId = Form.useWatch('themeId', form);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => p.themeId === currentThemeId);
  }, [properties, currentThemeId]);

  const columns = [
    {
      title: '卡片名称 / 文案',
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: Card) => (
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
      title: '卡组类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag 
          color={type === 'fate' ? 'purple' : 'orange'} 
          bordered={false}
          style={{ borderRadius: '4px', margin: 0, fontSize: '12px', padding: '0 8px' }}
        >
          {type === 'fate' ? '🔮 命运卡' : '🎲 机会卡'}
        </Tag>
      )
    },
    {
      title: '触发逻辑',
      dataIndex: 'action',
      key: 'action',
      width: 420,
      render: (action: string, record: Card) => {
        const actionMap: Record<string, { label: string, color: string, icon: string }> = {
          move_to: { label: '移动至指定位置', color: 'blue', icon: '📍' },
          add_money: { label: '获得金钱收益', color: 'green', icon: '💰' },
          remove_money: { label: '扣除/支付费用', color: 'volcano', icon: '💸' },
          jail: { label: '强制入狱', color: 'red', icon: '🚔' },
          out_of_jail: { label: '获得出狱许可证', color: 'gold', icon: '🎫' }
        };
        const config = actionMap[action] || { label: action, color: 'default', icon: '⚡' };
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            background: '#fafafa', 
            borderRadius: '8px', 
            border: '1px solid #f0f0f0',
            padding: '6px 12px',
            width: 'fit-content'
          }}>
            <Space size={12}>
              <Tag color={config.color} bordered={false} style={{ margin: 0 }}>{config.icon} {config.label}</Tag>
              {action === 'move_to' && record.params?.targetId && (
                <div style={{ borderLeft: '1px solid #e8e8e8', paddingLeft: 12 }}>
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>目标: </span>
                  <Text strong style={{ fontSize: '13px' }}>
                    {(properties.find(p => p.id === record.params.targetId)?.name) || record.params.targetId}
                  </Text>
                </div>
              )}
              {(action === 'add_money' || action === 'remove_money') && record.params?.amount !== undefined && (
                <div style={{ borderLeft: '1px solid #e8e8e8', paddingLeft: 12 }}>
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>金额: </span>
                  <Text strong style={{ fontSize: '14px', color: action === 'add_money' ? '#52c41a' : '#ff4d4f' }}>
                    ¥{record.params.amount.toLocaleString()}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      align: 'right' as const,
      render: (_: any, record: Card) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm 
            title="确定要删除这张卡片吗？" 
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <IdcardOutlined style={{ marginRight: 16, color: '#722ed1' }} />
            命运/机会卡管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 800, marginBottom: 0 }}>
            在此配置游戏中的随机事件。您可以定义卡片的视觉文案、触发的逻辑效果（如加减金钱、强制位移等）以及具体参数。
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
            background: '#722ed1'
          }}
        >
          创建新卡片
        </Button>
      </div>

      <div style={{ padding: '0 40px' }}>
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
                <RocketOutlined style={{ fontSize: '18px' }} />
                <span>{t.name}</span>
              </Space>
            ),
            children: (
              <div style={{ padding: '24px 0 40px 0' }}>
                <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '13px', color: '#8c8c8c', width: '80px' }}>卡组类型:</span>
                    <Segmented
                      value={filterType}
                      onChange={(val) => setFilterType(val as string)}
                      options={[
                        { label: '全部卡片', value: 'all' },
                        { label: '🔮 命运卡 (Fate)', value: 'fate' },
                        { label: '🎲 机会卡 (Chance)', value: 'chance' }
                      ]}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '13px', color: '#8c8c8c', width: '80px' }}>触发逻辑:</span>
                    <Segmented
                      value={filterAction}
                      onChange={(val) => setFilterAction(val as string)}
                      options={[
                        { label: '全部逻辑', value: 'all' },
                        { label: '📍 移动', value: 'move_to' },
                        { label: '💰 获得', value: 'add_money' },
                        { label: '💸 支付', value: 'remove_money' },
                        { label: '🚔 入狱', value: 'jail' },
                        { label: '🎫 许可', value: 'out_of_jail' }
                      ]}
                    />
                  </div>
                </Space>
                <Table 
                  columns={columns} 
                  dataSource={cards.filter(c => 
                    c.themeId === t.id && 
                    (filterType === 'all' || c.type === filterType) &&
                    (filterAction === 'all' || c.action === filterAction)
                  )} 
                  rowKey="id" 
                  bordered={false} 
                  pagination={{ pageSize: 15, showSizeChanger: false }} 
                  size="middle"
                  style={{ width: '100%' }}
                  locale={{ emptyText: '暂无符合条件的卡片。' }}
                />
              </div>
            )
          }))}
        />
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 24, background: '#722ed1', borderRadius: 2 }} />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>{editingCard ? '编辑卡片信息' : '创建新卡组卡片'}</span>
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
          {/* 基础归属信息 */}
          <div style={{ marginBottom: 32 }}>
            <Space size={8} style={{ marginBottom: 20 }}>
              <RocketOutlined style={{ color: '#722ed1', fontSize: '18px' }} />
              <Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>核心基础信息</Text>
            </Space>
            
            <Form.Item name="text" label={<span style={{ fontWeight: 600, color: '#595959' }}>卡片文案 (标题)</span>} rules={[{ required: true, message: '请输入卡片标题文案' }]}>
              <Input placeholder="例如: 银行派息 / 缴纳保险" size="large" style={{ borderRadius: '8px' }} />
            </Form.Item>
            
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="themeId" label={<span style={{ fontWeight: 600, color: '#595959' }}>所属游戏主题</span>} rules={[{ required: true }]}>
                  <Select 
                    size="large" 
                    placeholder="选择卡片所属主题" 
                    style={{ borderRadius: '8px' }}
                    disabled={!!editingCard}
                  >
                    {themes.filter(t => t && t.id).map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label={<span style={{ fontWeight: 600, color: '#595959' }}>卡组类型</span>} rules={[{ required: true }]}>
                  <Select size="large" style={{ borderRadius: '8px' }}>
                    <Select.Option value="fate">🔮 命运卡组 (Fate)</Select.Option>
                    <Select.Option value="chance">🎲 机会卡组 (Chance)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: '0 0 32px 0', borderStyle: 'dashed' }} />

          {/* 逻辑动作配置 */}
          <div style={{ marginBottom: 32 }}>
            <Space size={8} style={{ marginBottom: 20 }}>
              <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
              <Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>逻辑动作与参数</Text>
            </Space>

            <Form.Item name="action" label={<span style={{ fontWeight: 600, color: '#595959' }}>触发逻辑效果</span>} rules={[{ required: true }]}>
              <Select size="large" style={{ borderRadius: '8px' }}>
                <Select.Option value="move_to">📍 移动至指定格</Select.Option>
                <Select.Option value="add_money">💰 获得金钱奖励</Select.Option>
                <Select.Option value="remove_money">💸 支付/扣除金钱</Select.Option>
                <Select.Option value="jail">🚔 强制入狱</Select.Option>
                <Select.Option value="out_of_jail">🎫 获得出狱许可证</Select.Option>
              </Select>
            </Form.Item>

            <div style={{ padding: '8px 0' }}>
              {actionType === 'move_to' && (
                <Form.Item name={['params', 'targetId']} label={<span style={{ fontWeight: 600, color: '#595959' }}>目标地块</span>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                  <Select 
                    showSearch 
                    size="large"
                    optionFilterProp="children" 
                    placeholder="搜索并选择目标地块"
                    style={{ borderRadius: '8px' }}
                  >
                    {filteredProperties.map(p => (
                      <Select.Option key={p.id} value={p.id}>
                        <Space>
                          <Tag style={{ borderRadius: '4px', margin: 0, fontSize: '12px' }}>{p.type === 'normal' ? '🏠' : p.type === 'station' ? '🚂' : '💡'}</Tag>
                          {p.name}
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {(actionType === 'add_money' || actionType === 'remove_money') && (
                <Form.Item name={['params', 'amount']} label={<span style={{ fontWeight: 600, color: '#595959' }}>涉及金额 (¥)</span>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                  <InputNumber 
                    prefix="¥" 
                    size="large"
                    style={{ width: '100%', borderRadius: '8px' }} 
                    placeholder="请输入具体金额"
                    formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  />
                </Form.Item>
              )}

              {(actionType === 'jail' || actionType === 'out_of_jail') && (
                <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  该动作无需额外参数。玩家将执行预设的{actionType === 'jail' ? '入狱' : '获得出狱卡'}逻辑。
                </div>
              )}

              {(!actionType || (actionType !== 'move_to' && actionType !== 'add_money' && actionType !== 'remove_money' && actionType !== 'jail' && actionType !== 'out_of_jail')) && (
                <Text type="secondary" style={{ fontSize: '13px' }}>请先选择逻辑动作以配置对应参数。</Text>
              )}
            </div>
          </div>

          {/* 详细描述区域 */}
          <Form.Item name="description" label={<span style={{ fontWeight: 600, color: '#595959' }}>详细描述 / 备注</span>}>
            <TextArea 
              rows={3} 
              placeholder="详细的说明文字，会显示在卡片下方... (可选)" 
              style={{ borderRadius: '12px', padding: '12px' }} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CardManager;


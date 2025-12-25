import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, 
  Space, message, Tag, Select, Typography, 
  Popconfirm, Row, Col, Divider, InputNumber, Tabs
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
const { Text, Title, Paragraph } = Typography;

const CardManager: React.FC = () => {
  const location = useLocation();
  const [cards, setCards] = useState<Card[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'fate' ? 'purple' : 'orange'} bordered={false}>
          {type === 'fate' ? '命运' : '机会'}
        </Tag>
      )
    },
    {
      title: '卡片名称/文案',
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: Card) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </Space>
      )
    },
    {
      title: '触发动作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const actionMap: Record<string, string> = {
          move_to: '移动至',
          add_money: '获得金钱',
          remove_money: '扣除金钱',
          jail: '入狱',
          out_of_jail: '获得出狱卡'
        };
        return <Tag color="blue">{actionMap[action] || action}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: Card) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定要删除这张卡片吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in">
      <div style={{ padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}><IdcardOutlined style={{ marginRight: 12, color: '#722ed1' }} />命运/机会卡管理</Title>
          <Paragraph style={{ color: '#8c8c8c', marginBottom: 0 }}>
            在此配置游戏中的随机事件。您可以定义卡片的视觉文案、触发的逻辑效果（如加减金钱、强制位移等）以及具体参数。
          </Paragraph>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd}>创建新卡片</Button>
      </div>

      <div style={{ padding: '24px 40px' }}>
        <Tabs 
          activeKey={activeThemeId} 
          onChange={setActiveThemeId}
          items={themes.map(t => ({
            key: t.id,
            label: <Space><RocketOutlined />{t.name}</Space>,
            children: (
              <Table 
                columns={columns} 
                dataSource={cards.filter(c => c.themeId === t.id)} 
                rowKey="id" 
                pagination={false}
                size="middle"
              />
            )
          }))}
        />
      </div>

      <Modal
        title={editingCard ? '编辑卡片' : '创建新卡片'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="themeId" label="所属游戏主题" rules={[{ required: true }]}>
                <Select disabled={!!editingCard}>
                  {themes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="卡组类型" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="fate">🔮 命运卡组</Select.Option>
                  <Select.Option value="chance">🎲 机会卡组</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="action" label="逻辑动作" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="move_to">📍 移动至指定格</Select.Option>
                  <Select.Option value="add_money">💰 获得金钱</Select.Option>
                  <Select.Option value="remove_money">💸 扣除金钱</Select.Option>
                  <Select.Option value="jail">🚔 强制入狱</Select.Option>
                  <Select.Option value="out_of_jail">🎫 获得出狱许可证</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="text" label="卡片文案 (标题)" rules={[{ required: true, message: '请输入卡片标题文案' }]}>
            <Input placeholder="例如: 银行派息 / 缴纳保险" />
          </Form.Item>

          <Form.Item name="description" label="卡片描述">
            <TextArea rows={2} placeholder="详细的说明文字..." />
          </Form.Item>

          <Divider orientation="left" plain><Text type="secondary" style={{ fontSize: '12px' }}>动作参数设置</Text></Divider>

          {actionType === 'move_to' && (
            <Form.Item name={['params', 'targetId']} label="目标地块" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="children">
                {filteredProperties.map(p => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {(actionType === 'add_money' || actionType === 'remove_money') && (
            <Form.Item name={['params', 'amount']} label="金额数量" rules={[{ required: true }]}>
              <InputNumber prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          )}

          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#8c8c8c' }}>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            提示：这些配置将决定玩家落位在对应功能格时触发的底层逻辑。
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CardManager;


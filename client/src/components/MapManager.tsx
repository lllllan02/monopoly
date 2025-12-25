import React, { useEffect, useState } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, message, Tag, Select, Typography, 
  Popconfirm, Tabs, Layout 
} from 'antd';
import { 
  EnvironmentOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  BuildOutlined,
  RocketOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  DragOutlined
} from '@ant-design/icons';
import { type Map, MapService } from '../services/MapService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type Property, PropertyService } from '../services/PropertyService';

const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

const MapManager: React.FC = () => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMap, setEditingMap] = useState<Map | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [form] = Form.useForm();
  
  // 编辑器状态
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentMap, setCurrentMap] = useState<Map | null>(null);

  const fetchData = async () => {
    try {
      const [mapsData, themesData, propsData] = await Promise.all([
        MapService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => [])
      ]);
      setMaps(Array.isArray(mapsData) ? mapsData : []);
      setThemes(Array.isArray(themesData) ? themesData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);
      
      if (Array.isArray(themesData) && themesData.length > 0 && !activeThemeId) {
        setActiveThemeId(themesData[0].id);
      }
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMap = () => {
    setEditingMap(null);
    form.resetFields();
    form.setFieldsValue({ themeId: activeThemeId, size: 40 });
    setIsModalVisible(true);
  };

  const handleSaveMap = async () => {
    try {
      const values = await form.validateFields();
      if (editingMap) {
        await MapService.update(editingMap.id, values);
        message.success('修改成功');
      } else {
        // 创建新地图时初始化空槽位
        const slots = Array.from({ length: values.size }, () => ({ type: 'empty' }));
        await MapService.create({ ...values, slots });
        message.success('创建成功');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleOpenEditor = (map: Map) => {
    setCurrentMap(JSON.parse(JSON.stringify(map))); // 深拷贝防止直接修改
    setIsEditorOpen(true);
  };

  const handleSaveEditor = async () => {
    if (!currentMap) return;
    try {
      await MapService.update(currentMap.id, currentMap);
      message.success('地图保存成功');
      setIsEditorOpen(false);
      fetchData();
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 渲染地块库（可拖动）
  const renderLibrary = () => {
    const themeProps = properties.filter(p => p.themeId === currentMap?.themeId);
    
    const functionalSlots = [
      { type: 'start', name: '起点' },
      { type: 'jail', name: '监狱' },
      { type: 'fate', name: '命运' },
      { type: 'chance', name: '机会' },
      { type: 'tax', name: '税收格' },
      { type: 'chest', name: '宝库格' }
    ];

    return (
      <div style={{ padding: '16px' }}>
        <Title level={5} style={{ marginBottom: 16 }}>1. 基础功能格</Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {functionalSlots.map(slot => (
            <div 
              key={slot.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('slotType', slot.type);
                e.dataTransfer.setData('slotName', slot.name);
              }}
              style={{
                padding: '6px 10px',
                background: '#fafafa',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'grab',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <DragOutlined /> {slot.name}
            </div>
          ))}
        </div>

        <Title level={5} style={{ marginBottom: 16 }}>2. 关联资产库</Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {themeProps.map(prop => (
            <div 
              key={prop.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('propertyId', prop.id);
                e.dataTransfer.setData('slotType', 'property');
              }}
              style={{
                padding: '10px 12px',
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <DragOutlined style={{ color: '#bfbfbf' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{prop.name}</div>
                <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{prop.type === 'normal' ? '土地' : '特殊'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染地图插槽
  const handleDrop = (index: number, e: React.DragEvent) => {
    const slotType = e.dataTransfer.getData('slotType');
    const propId = e.dataTransfer.getData('propertyId');
    const slotName = e.dataTransfer.getData('slotName');
    
    if (currentMap) {
      const newSlots = [...currentMap.slots];
      if (slotType === 'property' && propId) {
        const prop = properties.find(p => p.id === propId);
        if (prop) {
          newSlots[index] = {
            type: 'property',
            propertyId: prop.id,
            name: prop.name
          };
        }
      } else if (slotType) {
        newSlots[index] = {
          type: slotType as any,
          name: slotName
        };
      }
      setCurrentMap({ ...currentMap, slots: newSlots });
    }
  };

  const renderSlot = (index: number) => {
    const slot = currentMap?.slots[index] || { type: 'empty' };
    
    const typeConfig: Record<string, { color: string, bg: string }> = {
      empty: { color: '#d9d9d9', bg: '#fafafa' },
      property: { color: '#1890ff', bg: '#e6f7ff' },
      start: { color: '#52c41a', bg: '#f6ffed' },
      jail: { color: '#ff4d4f', bg: '#fff1f0' },
      fate: { color: '#722ed1', bg: '#f9f0ff' },
      chance: { color: '#fa8c16', bg: '#fff7e6' },
      tax: { color: '#595959', bg: '#f5f5f5' },
      chest: { color: '#eb2f96', bg: '#fff0f6' }
    };

    const config = typeConfig[slot.type] || typeConfig.empty;
    
    return (
      <div 
        key={index}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(index, e)}
        style={{
          width: '100px',
          height: '100px',
          border: `1px ${slot.type === 'empty' ? 'dashed' : 'solid'} ${config.color}`,
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.bg,
          position: 'relative',
          padding: 8,
          textAlign: 'center',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ fontSize: '10px', color: '#bfbfbf', position: 'absolute', top: 4, left: 4 }}>#{index + 1}</div>
        {slot.type === 'empty' ? (
          <Text type="secondary" style={{ fontSize: '11px', opacity: 0.5 }}>拖入</Text>
        ) : (
          <>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#1a1a1a', 
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%'
            }}>
              {slot.name}
            </div>
            <div style={{ fontSize: '9px', color: config.color, textTransform: 'uppercase', fontWeight: 'bold' }}>
              {slot.type}
            </div>
            <Button 
              type="text" 
              size="small" 
              icon={<DeleteOutlined style={{ fontSize: '10px' }} />} 
              style={{ position: 'absolute', top: 2, right: 2, height: '20px', width: '20px' }}
              onClick={() => {
                const newSlots = [...(currentMap?.slots || [])];
                newSlots[index] = { type: 'empty' };
                setCurrentMap({ ...currentMap!, slots: newSlots });
              }}
            />
          </>
        )}
      </div>
    );
  };

  if (isEditorOpen) {
    return (
      <Layout style={{ height: 'calc(100vh - 110px)', background: '#fff' }}>
        <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          {renderLibrary()}
        </Sider>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={16}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setIsEditorOpen(false)}>返回列表</Button>
              <Title level={4} style={{ margin: 0 }}>地图编辑: {currentMap?.name}</Title>
            </Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveEditor}>保存地图布局</Button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, 100px)', 
            gap: '12px',
            background: '#fafafa',
            padding: '24px',
            borderRadius: '12px',
            minHeight: '400px'
          }}>
            {Array.from({ length: currentMap?.size || 40 }).map((_, i) => renderSlot(i))}
          </div>
        </Content>
      </Layout>
    );
  }

  const columns = [
    { 
      title: '地图名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string, record: Map) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '16px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>ID: {record.id}</Text>
        </Space>
      )
    },
    { 
      title: '棋盘规模', 
      dataIndex: 'size', 
      key: 'size',
      render: (size: number) => <Tag color="blue">{size} 格</Tag>
    },
    { 
      title: '所属主题', 
      key: 'theme',
      render: (record: Map) => {
        const theme = themes.find(t => t.id === record.themeId);
        return <Tag icon={<RocketOutlined />}>{theme?.name || '未知主题'}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      align: 'right' as const,
      render: (_: any, record: Map) => (
        <Space>
          <Button type="primary" ghost icon={<BuildOutlined />} onClick={() => handleOpenEditor(record)}>设计布局</Button>
          <Button icon={<EditOutlined />} onClick={() => {
            setEditingMap(record);
            form.setFieldsValue(record);
            setIsModalVisible(true);
          }} />
          <Popconfirm title="确定删除吗？" onConfirm={() => MapService.delete(record.id).then(fetchData)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in">
      <div style={{ padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}><EnvironmentOutlined style={{ marginRight: 12, color: '#52c41a' }} />地图设计</Title>
          <Paragraph style={{ color: '#8c8c8c', marginBottom: 0 }}>
            为每个游戏主题设计独特的棋盘布局。您可以自由定义棋盘格子顺序，并将已创建的地块模型拖入特定槽位。
          </Paragraph>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreateMap}>创建新地图</Button>
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
                dataSource={maps.filter(m => m.themeId === t.id)} 
                rowKey="id" 
                pagination={false}
              />
            )
          }))}
        />
      </div>

      <Modal
        title={editingMap ? '编辑地图信息' : '创建新地图'}
        open={isModalVisible}
        onOk={handleSaveMap}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="地图名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 经典环球之旅" />
          </Form.Item>
          <Form.Item name="themeId" label="所属主题" rules={[{ required: true }]}>
            <Select disabled={!!editingMap}>
              {themes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="size" label="棋盘格数" rules={[{ required: true }]}>
            <InputNumber min={20} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MapManager;


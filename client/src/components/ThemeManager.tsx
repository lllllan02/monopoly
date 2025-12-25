import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, Typography, App } from 'antd';
import { 
  RocketOutlined, BankOutlined, EnvironmentOutlined, 
  PlusOutlined, BuildOutlined, PercentageOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { type Theme, ThemeService } from '../services/ThemeService';
import { PropertyService, type Property } from '../services/PropertyService';
import { MapService } from '../services/MapService';
import { RentLevelService } from '../services/RentLevelService';

import { CardService } from '../services/CardService';

interface ThemeWithStats extends Theme {
  defaultTileCount: number;
  customTileCount: number;
  rentLevelCount: number;
  mapCount: number;
  cardCount: number;
}

const ThemeManager: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [themes, setThemes] = useState<ThemeWithStats[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [form] = Form.useForm();

  const fetchThemesAndStats = async () => {
    try {
      const [themesData, propsData, mapsData, levelsData, cardsData] = await Promise.all([
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => []),
        MapService.getAll().catch(() => []),
        RentLevelService.getAll().catch(() => []),
        CardService.getAll().catch(() => [])
      ]);

      const safeThemes = Array.isArray(themesData) ? themesData : [];
      const safeProps = Array.isArray(propsData) ? propsData : [] as Property[];
      const safeMaps = Array.isArray(mapsData) ? mapsData : [];
      const safeLevels = Array.isArray(levelsData) ? levelsData : [];
      const safeCards = Array.isArray(cardsData) ? cardsData : [];

      const themesWithStats = safeThemes.map(theme => {
        if (!theme || !theme.id) return null;
        const themeProps = safeProps.filter(p => p && p.themeId === theme.id);
        return {
          ...theme,
          defaultTileCount: themeProps.filter(p => p.isDefault).length,
          customTileCount: themeProps.filter(p => !p.isDefault).length,
          rentLevelCount: safeLevels.filter((l: any) => l && l.themeId === theme.id).length,
          mapCount: safeMaps.filter((m: any) => m && m.themeId === theme.id).length,
          cardCount: safeCards.filter((c: any) => c && c.themeId === theme.id).length
        };
      }).filter(Boolean) as ThemeWithStats[];

      setThemes(themesWithStats);
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('获取主题列表及统计失败');
    }
  };

  useEffect(() => {
    fetchThemesAndStats();
  }, []);

  const handleAdd = () => {
    setEditingTheme(null);
    form.resetFields();
    form.setFieldsValue({ 
      name: '',
      stationRent: [25, 50, 100, 200],
      utilityMultipliers: [4, 10]
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Theme) => {
    setEditingTheme(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await ThemeService.delete(id);
      message.success('删除成功');
      fetchThemesAndStats();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingTheme) {
        await ThemeService.update(editingTheme.id, values);
        message.success('修改成功');
      } else {
        await ThemeService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchThemesAndStats();
    } catch (error) {
      console.error('Submit error:', error);
      message.error('操作失败');
    }
  };

  const columns = [
    { 
      title: '主题名称', 
      dataIndex: 'name', 
      key: 'name',
      width: 250,
      render: (text: string, record: ThemeWithStats) => (
        <Space direction="vertical" size={2} style={{ paddingLeft: 16 }}>
          <Typography.Text strong style={{ fontSize: '16px' }}>{text}</Typography.Text>
          <div style={{ fontSize: '12px', color: '#bfbfbf', marginTop: 4 }}>
            包含 {record.defaultTileCount + record.customTileCount} 个地块 · {record.rentLevelCount} 个经济等级
          </div>
        </Space>
      )
    },
    {
      title: '关联内容统计',
      key: 'stats',
      width: 650,
      render: (_: any, record: ThemeWithStats) => (
        <Space size={24} style={{ fontSize: '13px' }}>
          {/* 1. 经济体系 */}
          <Space 
            size={6} 
            className="clickable-stat"
            onClick={() => navigate('/admin/rent-levels', { state: { themeId: record.id } })}
          >
            <PercentageOutlined style={{ color: '#fa8c16', opacity: 0.6 }} /> 
            <span style={{ color: '#8c8c8c' }}>经济体系:</span>
            <Typography.Text strong style={{ color: '#fa8c16' }}>{record.rentLevelCount}</Typography.Text>
          </Space>

          {/* 分隔符 */}
          <Space size={4}><Typography.Text style={{ opacity: 0.1 }}>|</Typography.Text></Space>

          {/* 2. 地块管理 (内置 + 自定义) */}
          <Space size={16}>
            <Space 
              size={6} 
              className="clickable-stat"
              onClick={() => navigate('/admin/properties', { state: { themeId: record.id, tab: 'default' } })}
            >
              <BankOutlined style={{ color: '#722ed1', opacity: 0.6 }} /> 
              <span style={{ color: '#8c8c8c' }}>内置地块:</span>
              <Typography.Text strong style={{ color: '#722ed1' }}>{record.defaultTileCount}</Typography.Text>
            </Space>
            <Space 
              size={6} 
              className="clickable-stat"
              onClick={() => navigate('/admin/properties', { state: { themeId: record.id, tab: 'custom' } })}
            >
              <BuildOutlined style={{ color: '#1890ff', opacity: 0.6 }} /> 
              <span style={{ color: '#8c8c8c' }}>自定义:</span>
              <Typography.Text strong style={{ color: '#1890ff' }}>{record.customTileCount}</Typography.Text>
            </Space>
          </Space>

          {/* 分隔符 */}
          <Space size={4}><Typography.Text style={{ opacity: 0.1 }}>|</Typography.Text></Space>

          {/* 3. 卡组管理 */}
          <Space 
            size={6} 
            className="clickable-stat"
            onClick={() => navigate('/admin/cards', { state: { themeId: record.id } })}
          >
            <IdcardOutlined style={{ color: '#eb2f96', opacity: 0.6 }} /> 
            <span style={{ color: '#8c8c8c' }}>卡组管理:</span>
            <Typography.Text strong style={{ color: '#eb2f96' }}>{record.cardCount}</Typography.Text>
          </Space>

          {/* 分隔符 */}
          <Space size={4}><Typography.Text style={{ opacity: 0.1 }}>|</Typography.Text></Space>

          {/* 4. 地图设计 */}
          <Space 
            size={6} 
            className="clickable-stat"
            onClick={() => navigate('/admin/maps', { state: { themeId: record.id } })}
          >
            <EnvironmentOutlined style={{ color: '#52c41a', opacity: 0.6 }} /> 
            <span style={{ color: '#8c8c8c' }}>地图设计:</span>
            <Typography.Text strong style={{ color: '#52c41a' }}>{record.mapCount}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      align: 'right' as const,
      render: (_: any, record: ThemeWithStats) => (
        <Space size="middle">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>重命名</Button>
          <Popconfirm 
            title="确定要删除这个主题吗？" 
            description={
              (record.defaultTileCount + record.customTileCount) > 0 
                ? `该主题下尚有 ${record.defaultTileCount + record.customTileCount} 个地块和 ${record.rentLevelCount} 个经济等级，删除后它们将失去分类。` 
                : undefined
            }
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small">删除主题</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <RocketOutlined style={{ marginRight: 16, color: '#722ed1' }} />
            游戏主题管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            在此管理游戏的不同章节与主题名称。具体的经济平衡数值（如买地、租金等）已移至【经济等级管理】中统一配置。
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
            boxShadow: '0 4px 12px rgba(114, 46, 209, 0.25)'
          }}
        >
          创建新主题
        </Button>
      </div>
      
      <div style={{ padding: '0 40px' }}>
        <Table 
          columns={columns} 
          dataSource={themes} 
          rowKey="id" 
          bordered={false} 
          pagination={false} 
          size="middle"
        />
      </div>

      <Modal
        title={
          <Space>
            <BuildOutlined style={{ color: '#722ed1' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{editingTheme ? '重命名主题' : '创建新主题'}</span>
          </Space>
        }
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={480}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            name="name" 
            label={<Typography.Text strong style={{ fontSize: '15px' }}>主题名称</Typography.Text>} 
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder="例如: 经典大富翁 / 繁华北京" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ThemeManager;

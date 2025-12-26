import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Layout, Empty, Popconfirm, Tabs, App } from 'antd';
import { 
  CloudServerOutlined, 
  EyeOutlined, 
  ClockCircleOutlined,
  DeleteOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { type MapSlot, SnapshotService, type MapSnapshot, MapService } from '../services/MapService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type Property } from '../services/PropertyService';
import { type RentLevel } from '../services/RentLevelService';

const { Title, Text, Paragraph } = Typography;

const GRID_SIZE = 80;

const SnapshotManager: React.FC = () => {
  const { message } = App.useApp();
  const [snapshots, setSnapshots] = useState<MapSnapshot[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<MapSnapshot | null>(null);
  
  const [activeThemeId, setActiveThemeId] = useState<string>('');

  const fetchData = async () => {
    try {
      const [snapshotsData, themesData, mapsData] = await Promise.all([
        SnapshotService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => []),
        MapService.getAll().catch(() => [])
      ]);
      setSnapshots(Array.isArray(snapshotsData) ? snapshotsData : []);
      const fetchedThemes = Array.isArray(themesData) ? themesData : [];
      setThemes(fetchedThemes);
      setMaps(Array.isArray(mapsData) ? mapsData : []);

      if (fetchedThemes.length > 0 && !activeThemeId) {
        setActiveThemeId(fetchedThemes[0].id);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('获取快照数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 计算当前主题下过滤后的快照
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter(s => (s.themeId || s.theme?.id) === activeThemeId);
  }, [snapshots, activeThemeId]);

  const handlePreview = (snapshot: MapSnapshot) => {
    setPreviewSnapshot(snapshot);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await SnapshotService.delete(id);
      message.success('快照已永久删除');
      fetchData();
    } catch (error) {
      message.error('删除快照失败');
    }
  };

  const columns = [
    {
      title: '源地图名称',
      key: 'sourceMap',
      render: (_: any, record: MapSnapshot) => {
        // 兼容旧数据：如果名称末尾包含版本号，则剔除
        const cleanName = record.name.replace(new RegExp(`\\s+${record.version}$`), '');
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '15px' }}>{cleanName}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>地图ID: {record.mapId}</Text>
          </Space>
        );
      }
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (text: string) => (
        <Tag color="orange" style={{ fontWeight: 600, borderRadius: '4px' }}>{text || 'v1'}</Tag>
      )
    },
    {
      title: '所属主题',
      key: 'theme',
      render: (record: MapSnapshot) => (
        <Space size={4}>
          <RocketOutlined style={{ color: '#8c8c8c' }} />
          <span>{record.theme?.name || '未知主题'}</span>
        </Space>
      )
    },
    {
      title: '规模',
      key: 'slotCount',
      render: (record: MapSnapshot) => (
        <Tag color="blue" style={{ borderRadius: '10px' }}>{record.slots?.length || 0} 格</Tag>
      )
    },
    {
      title: '导出时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      sorter: (a: MapSnapshot, b: MapSnapshot) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(text).toLocaleString()}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: MapSnapshot) => (
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handlePreview(record)}
          >
            详情
          </Button>
          <Popconfirm 
            title="确定要永久删除此快照吗？" 
            description="删除后，基于此快照的游戏房间可能无法正常运行。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderPreviewCanvas = () => {
    if (!previewSnapshot) return null;

    const slots = previewSnapshot.slots;
    const snapProps = previewSnapshot.properties || [];
    const snapLevels = previewSnapshot.rentLevels || [];

    const xCoords = slots.map(s => s.x || 0);
    const yCoords = slots.map(s => s.y || 0);
    const minX = Math.min(...xCoords, 0);
    const minY = Math.min(...yCoords, 0);
    const maxX = Math.max(...xCoords, 0) + GRID_SIZE;
    const maxY = Math.max(...yCoords, 0) + GRID_SIZE;

    const canvasWidth = maxX - minX + GRID_SIZE * 2;
    const canvasHeight = maxY - minY + GRID_SIZE * 2;
    const originX = minX - GRID_SIZE;
    const originY = minY - GRID_SIZE;

    const typeColors: Record<string, string> = {
      start: '#52c41a', jail: '#ff4d4f', fate: '#722ed1', chance: '#fa8c16', station: '#595959', utility: '#faad14', property: '#1890ff'
    };

    return (
      <div style={{ 
        width: '100%', 
        height: '60vh', 
        overflow: 'auto', 
        background: '#f0f2f5',
        borderRadius: '8px',
        border: '1px solid #d9d9d9',
        position: 'relative',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ 
          width: canvasWidth, 
          height: canvasHeight, 
          position: 'relative',
          background: '#fff',
          backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}>
          {slots.map((slot, index) => {
            const prop = snapProps.find(p => p.id === slot.propertyId);
            const rentLevel = snapLevels.find(r => r.id === prop?.rentLevelId);
            
            const isBlankManual = !slot.propertyId && slot.type === 'property';
            const headerColor = slot.headerColor || (rentLevel?.color || (prop ? typeColors[prop.type] : typeColors[slot.type]) || '#d9d9d9');
            const displayName = slot.name || prop?.name || (isBlankManual ? '空白格' : '');
            const displayIcon = slot.icon || prop?.icon;
            const displayPrice = slot.price || prop?.price;

            return (
              <div 
                key={slot.id || index}
                style={{
                  width: GRID_SIZE - 8,
                  height: GRID_SIZE - 8,
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isBlankManual ? '#f5f5f5' : `linear-gradient(${headerColor}15, ${headerColor}15), #fff`,
                  position: 'absolute',
                  left: (slot.x || 0) - originX + 4,
                  top: (slot.y || 0) - originY + 4,
                  border: isBlankManual ? '1.5px dashed rgba(0,0,0,0.1)' : '1.5px solid rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {displayPrice && (
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    fontSize: '9px',
                    color: headerColor,
                    fontWeight: 'bold',
                    background: 'rgba(255,255,255,0.9)',
                    padding: '0 4px',
                    borderRadius: '2px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    border: `1px solid ${headerColor}30`,
                    zIndex: 15
                  }}>
                    ${displayPrice.toLocaleString()}
                  </div>
                )}

                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  {displayIcon && (
                    typeof displayIcon === 'string' && displayIcon.startsWith('<svg') ? (
                      <div dangerouslySetInnerHTML={{ __html: displayIcon }} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                    ) : (
                      <img src={Array.isArray(displayIcon) ? displayIcon[0] : displayIcon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="icon" />
                    )
                  )}
                </div>
                {displayName && !isBlankManual && (
                  <div style={{ 
                    width: '100%', 
                    height: '20px', 
                    background: headerColor, 
                    color: '#fff', 
                    fontSize: '9px', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 -1px 2px rgba(0,0,0,0.1)'
                  }}>
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      {displayName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '32px 40px 24px 40px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700 }}>
          <CloudServerOutlined style={{ marginRight: 16, color: '#1890ff' }} />
          游玩快照管理
        </Title>
        <Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 800, marginBottom: 0 }}>
          此处存储地图的“已发布”版本。每个快照均包含导出时刻的完整地块元数据、经济规则和卡组配置，
          实现与后台设计的物理隔离，确保游玩环境的长期稳定性。
        </Paragraph>
      </div>

      <div style={{ padding: '0 40px' }}>
        {themes && themes.length > 0 ? (
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
                  <RocketOutlined style={{ fontSize: '18px' }} />
                  <span>{t.name}</span>
                </Space>
              ),
              children: (
                <div style={{ padding: '24px 0 40px 0' }}>
                  <Table 
                    columns={columns} 
                    dataSource={filteredSnapshots} 
                    rowKey="id" 
                    bordered={false}
                    size="middle"
                    pagination={{ 
                      pageSize: 10,
                      showTotal: (total) => `共 ${total} 个快照版本`
                    }}
                    locale={{ emptyText: <Empty description="当前主题下暂无快照数据" style={{ padding: '40px 0' }} /> }}
                  />
                </div>
              )
            }))}
          />
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#bfbfbf' }}>
            正在加载主题快照...
          </div>
        )}
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 18, background: '#1890ff', borderRadius: 2 }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>快照详情预览</span>
          </div>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsPreviewOpen(false)}>关闭预览</Button>
        ]}
        width={1000}
        destroyOnClose
        centered
      >
        <div style={{ marginBottom: 20 }}>
          <Space size="middle">
            <div style={{ padding: '8px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 2 }}>快照名称</Text>
              <Text strong style={{ fontSize: '16px' }}>
                {previewSnapshot?.name.replace(new RegExp(`\\s+${previewSnapshot?.version}$`), '')}
              </Text>
            </div>
            <div style={{ padding: '8px 16px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 2 }}>版本标识</Text>
              <Tag color="orange" style={{ margin: 0, fontWeight: 600 }}>{previewSnapshot?.version}</Tag>
            </div>
            <div style={{ padding: '8px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 2 }}>导出时间</Text>
              <Text strong style={{ fontSize: '16px' }}>{previewSnapshot?.publishedAt ? new Date(previewSnapshot.publishedAt).toLocaleString() : '未知'}</Text>
            </div>
            <div style={{ padding: '8px 16px', background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '6px' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 2 }}>配置规模</Text>
              <Text strong style={{ fontSize: '16px' }}>{previewSnapshot?.slots?.length || 0} 个槽位</Text>
            </div>
          </Space>
        </div>
        {renderPreviewCanvas()}
      </Modal>
    </div>
  );
};

export default SnapshotManager;

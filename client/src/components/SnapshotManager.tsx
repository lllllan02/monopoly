import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Tag, Space, Typography, Modal, Layout, Empty, Popconfirm, Tabs, App, Divider } from 'antd';
import { 
  CloudServerOutlined, 
  EyeOutlined, 
  ClockCircleOutlined,
  DeleteOutlined,
  RocketOutlined,
  BuildOutlined
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

    const directions = [
      { dx: GRID_SIZE, dy: 0, unitX: 1, unitY: 0 },
      { dx: -GRID_SIZE, dy: 0, unitX: -1, unitY: 0 },
      { dx: 0, dy: GRID_SIZE, unitX: 0, unitY: 1 },
      { dx: 0, dy: -GRID_SIZE, unitX: 0, unitY: -1 }
    ];

    // 构建路径链
    const pathChain: { from: any, to: any, dir: typeof directions[0] }[] = [];
    let startSlot = slots.find(s => {
      const p = snapProps.find(prop => prop.id === s.propertyId);
      return p ? p.type === 'start' : s.type === 'start';
    });

    if (startSlot) {
      const visited = new Set<string>();
      let current = startSlot;
      visited.add(current.id);
      let loopCount = 0;
      
      while (current.nextSlotId && loopCount < 200) {
        loopCount++;
        const nextId = current.nextSlotId;
        const next = slots.find(s => s.id === nextId);
        if (next) {
          const dx = (next.x || 0) - (current.x || 0);
          const dy = (next.y || 0) - (current.y || 0);
          const dir = directions.find(d => Math.abs(d.dx - dx) < 10 && Math.abs(d.dy - dy) < 10);
          
          if (dir) {
            pathChain.push({ from: current, to: next, dir });
            if (visited.has(next.id)) break; // 闭环
            visited.add(next.id);
            current = next;
          } else break;
        } else break;
      }
    }

    const typeColors: Record<string, string> = {
      start: '#52c41a', jail: '#ff4d4f', fate: '#722ed1', chance: '#fa8c16', station: '#595959', utility: '#faad14', property: '#1890ff', normal: '#1890ff'
    };

    const typeConfig: Record<string, { color: string }> = {
      empty: { color: '#d9d9d9' },
      property: { color: '#1890ff' },
      normal: { color: '#1890ff' },
      station: { color: '#595959' },
      utility: { color: '#faad14' },
      start: { color: '#52c41a' },
      jail: { color: '#ff4d4f' },
      fate: { color: '#722ed1' },
      chance: { color: '#fa8c16' },
      tax: { color: '#8c8c8c' },
      chest: { color: '#eb2f96' }
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
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          width: canvasWidth, 
          height: canvasHeight, 
          position: 'relative',
          background: '#fff',
          backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          flexShrink: 0,
          margin: 'auto'
        }}>
          {/* 渲染路径走向 */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            {pathChain.map((link, idx) => {
              const sX = (link.from.x || 0) - originX + GRID_SIZE / 2;
              const sY = (link.from.y || 0) - originY + GRID_SIZE / 2;
              const half = GRID_SIZE / 2;
              const gapX = sX + link.dir.unitX * half;
              const gapY = sY + link.dir.unitY * half;
              const rectW = link.dir.unitX ? 8 : GRID_SIZE - 8;
              const rectH = link.dir.unitY ? 8 : GRID_SIZE - 8;

              return (
                <g key={`path-link-${idx}`}>
                  <rect
                    x={gapX - rectW / 2}
                    y={gapY - rectH / 2}
                    width={rectW}
                    height={rectH}
                    fill="#ff4d4f"
                    opacity={0.6}
                    rx={2}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255,77,79,0.4))' }}
                  />
                  <polygon 
                    points={`
                      ${gapX + link.dir.unitX * 3},${gapY + link.dir.unitY * 3} 
                      ${gapX - link.dir.unitX * 2 + link.dir.unitY * 4},${gapY - link.dir.unitY * 2 - link.dir.unitX * 4} 
                      ${gapX - link.dir.unitX * 2 - link.dir.unitY * 4},${gapY - link.dir.unitY * 2 + link.dir.unitX * 4}
                    `}
                    fill="#ff4d4f"
                    opacity={0.8}
                  />
                </g>
              );
            })}
          </svg>

          {slots.map((slot, index) => {
            const prop = snapProps.find(p => p.id === slot.propertyId);
            const rentLevel = snapLevels.find(r => r.id === prop?.rentLevelId);
            
            const isBlankManual = !slot.propertyId;
            const headerColor = slot.headerColor || (rentLevel?.color || (prop ? typeColors[prop.type] : typeConfig[slot.type || 'property']?.color) || '#d9d9d9');
            const displayName = prop?.name || slot.name || (isBlankManual ? '空白格' : '');
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  flexShrink: 0,
                  zIndex: 10
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

                <div style={{ 
                  flex: 1, 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '4px',
                  overflow: 'hidden',
                  zIndex: 1
                }}>
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
                    boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
                    zIndex: 5
                  }}>
                    <div style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      textAlign: 'center'
                    }}>
                      {displayName}
                    </div>
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
        <div style={{ marginBottom: 16, padding: '0 4px' }}>
          <Space split={<Divider type="vertical" style={{ height: 14, borderColor: '#e8e8e8' }} />} size="middle">
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: '13px' }}>地图:</Text>
              <Text strong style={{ fontSize: '13px' }}>
                {previewSnapshot?.name.replace(new RegExp(`\\s+${previewSnapshot?.version}$`), '')}
              </Text>
            </Space>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: '13px' }}>版本:</Text>
              <Tag color="orange" style={{ margin: 0, fontSize: '11px', lineHeight: '18px', height: '20px' }}>{previewSnapshot?.version}</Tag>
            </Space>
            <Space size={4}>
              <ClockCircleOutlined style={{ color: '#bfbfbf', fontSize: '13px' }} />
              <Text type="secondary" style={{ fontSize: '13px' }}>{previewSnapshot?.publishedAt ? new Date(previewSnapshot.publishedAt).toLocaleString() : '未知'}</Text>
            </Space>
            <Space size={4}>
              <BuildOutlined style={{ color: '#bfbfbf', fontSize: '13px' }} />
              <Text type="secondary" style={{ fontSize: '13px' }}>{previewSnapshot?.slots?.length || 0} 个地块</Text>
            </Space>
          </Space>
        </div>
        {renderPreviewCanvas()}
      </Modal>
    </div>
  );
};

export default SnapshotManager;

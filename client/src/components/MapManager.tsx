import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, Tag, Select, Typography, 
  Popconfirm, Tabs, Layout, App, Segmented
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
  DragOutlined,
  UndoOutlined,
  FilterOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { type Map, MapService } from '../services/MapService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type Property, PropertyService } from '../services/PropertyService';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';

const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

const GRID_SIZE = 80;

const MapManager: React.FC = () => {
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [maps, setMaps] = useState<Map[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentLevels, setRentLevels] = useState<RentLevel[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMap, setEditingMap] = useState<Map | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [form] = Form.useForm();
  
  // 编辑器状态
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentMap, setCurrentMap] = useState<Map | null>(null);
  const [history, setHistory] = useState<Map[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'builtin' | 'custom'>('builtin');
  const [secondaryFilter, setSecondaryFilter] = useState<string>('all');

  // 未保存变更警告逻辑
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (history.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // 现代浏览器需要设置这个值来触发警告
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [history.length]);

  // 刷新后停留逻辑：根据 URL 参数恢复编辑器状态 (仅在初次加载或手动输入 URL 时触发)
  useEffect(() => {
    const editingMapId = searchParams.get('editor');
    // 如果有 ID 且当前没打开编辑器，则尝试打开
    if (editingMapId && maps.length > 0 && !isEditorOpen && !currentMap) {
      const targetMap = maps.find(m => m.id === editingMapId);
      if (targetMap) {
        setCurrentMap(JSON.parse(JSON.stringify(targetMap)));
        setIsEditorOpen(true);
        setHistory([]);
      }
    }
  }, [maps]); // 仅在地图数据加载完成后校验一次

  const fetchData = async () => {
    try {
      const [mapsData, themesData, propsData, rentLevelsData] = await Promise.all([
        MapService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => []),
        RentLevelService.getAll().catch(() => [])
      ]);
      const fetchedMaps = Array.isArray(mapsData) ? mapsData : [];
      setMaps(fetchedMaps);
      setThemes(Array.isArray(themesData) ? themesData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);
      setRentLevels(Array.isArray(rentLevelsData) ? rentLevelsData : []);
      
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
        // 创建新地图时初始化为空列表，由编辑器添加
        await MapService.create({ ...values, slots: [] });
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
    setHistory([]); // 清空历史记录
    setIsEditorOpen(true);
    setSearchParams({ editor: map.id }); // 更新 URL，支持刷新恢复
  };

  const handleCloseEditor = useCallback(() => {
    const cleanup = () => {
      setSearchParams({}, { replace: true });
      setIsEditorOpen(false);
      setCurrentMap(null);
      setHistory([]);
    };

    if (history.length > 0) {
      modal.confirm({
        title: '未保存的变更',
        content: '您有尚未保存的地块布局变更，确定要离开吗？',
        okText: '离开',
        cancelText: '取消',
        onOk: cleanup
      });
    } else {
      cleanup();
    }
  }, [history.length, setSearchParams, modal]);

  // 辅助函数：更新地图并记录历史
  const updateMapWithHistory = (newMap: Map) => {
    if (currentMap) {
      setHistory(prev => [...prev, JSON.parse(JSON.stringify(currentMap))].slice(-20)); // 最多记录20步
    }
    setCurrentMap(newMap);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevMap = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentMap(prevMap);
    }
  };

  // 计算当前地块的边界逻辑
  const getEditorBounds = () => {
    if (!currentMap || currentMap.slots.length === 0) {
      return { minX: 0, minY: 0, maxX: GRID_SIZE, maxY: GRID_SIZE, hasSlots: false };
    }
    const xCoords = currentMap.slots.map(s => s.x || 0);
    const yCoords = currentMap.slots.map(s => s.y || 0);
    return {
      minX: Math.min(...xCoords),
      minY: Math.min(...yCoords),
      maxX: Math.max(...xCoords) + GRID_SIZE,
      maxY: Math.max(...yCoords) + GRID_SIZE,
      hasSlots: true
    };
  };

  const bounds = getEditorBounds();
  const canvasBuffer = bounds.hasSlots ? GRID_SIZE : 0; 
  const originX = bounds.minX - canvasBuffer;
  const originY = bounds.minY - canvasBuffer;
  const canvasWidth = (bounds.maxX - bounds.minX) + canvasBuffer * 2;
  const canvasHeight = (bounds.maxY - bounds.minY) + canvasBuffer * 2;

  const handleSaveEditor = async () => {
    if (!currentMap) return;
    setIsSaving(true);
    try {
      await MapService.update(currentMap.id, currentMap);
      message.success('地图保存成功');
      setHistory([]); // 保存后清空历史，消除未保存警告
      fetchData();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 渲染地块库（可拖动）
  const renderLibrary = () => {
    const themeProps = properties.filter(p => p.themeId === currentMap?.themeId);
    const themeRentLevels = rentLevels.filter(r => r.themeId === currentMap?.themeId);
    
    const allItems = themeProps.map(p => ({ 
      type: p.type, 
      name: p.name, 
      propertyId: p.id, 
      category: p.isDefault ? 'builtin' : 'custom',
      rentLevelId: p.rentLevelId,
      isPlaced: currentMap?.slots.some(slot => slot.propertyId === p.id),
      detail: p 
    }));

    // 筛选逻辑
    const filteredItems = allItems.filter(item => {
      // 1. 唯一性筛选：已经在画板中的地块不再展示
      if (item.isPlaced) return false;

      // 2. 一级筛选：内置 vs 自定义
      if (item.category !== libraryFilter) return false;

      // 3. 二级筛选
      if (secondaryFilter === 'all') return true;
      if (libraryFilter === 'builtin') {
        return item.type === secondaryFilter;
      } else {
        return item.rentLevelId === secondaryFilter;
      }
    });

    const getSecondaryOptions = () => {
      if (libraryFilter === 'builtin') {
        const types = Array.from(new Set(allItems.filter(i => i.category === 'builtin').map(i => i.type)));
        const typeLabels: Record<string, string> = {
          start: '起点', jail: '监狱', fate: '命运', chance: '机会', station: '车站', utility: '公用事业', normal: '普通土地'
        };
        return [
          { label: '全部类型', value: 'all' },
          ...types.map(t => ({ label: typeLabels[t] || t, value: t }))
        ];
      } else {
        return [
          { label: '全部等级', value: 'all' },
          ...themeRentLevels.map(r => ({ label: r.name, value: r.id }))
        ];
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            <FilterOutlined style={{ marginRight: 8 }} />地块资源库
          </Title>
          <Segmented
            block
            value={libraryFilter}
            onChange={(v) => {
              setLibraryFilter(v as 'builtin' | 'custom');
              setSecondaryFilter('all'); // 切换一级时重置二级
            }}
            options={[
              { label: '内置地块', value: 'builtin' },
              { label: '自定义地块', value: 'custom' }
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: 8, opacity: 0.6 }}>
              {libraryFilter === 'builtin' ? '按类型快捷筛选:' : '按收益等级快捷筛选:'}
            </Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {getSecondaryOptions().map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setSecondaryFilter(opt.value)}
              style={{
                    padding: '2px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid',
                    borderColor: secondaryFilter === opt.value ? '#722ed1' : '#d9d9d9',
                    background: secondaryFilter === opt.value ? '#f9f0ff' : '#fff',
                    color: secondaryFilter === opt.value ? '#722ed1' : 'rgba(0,0,0,0.65)',
                    fontWeight: secondaryFilter === opt.value ? 500 : 'normal'
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredItems.length > 0 ? filteredItems.map((item) => {
              const isProperty = item.category === 'custom';
              const rentLevel = rentLevels.find(r => r.id === item.detail?.rentLevelId);
              
              return (
                <div
                  key={`${item.propertyId}`}
              draggable
              onDragStart={(e) => {
                    e.dataTransfer.setData('offsetX', (GRID_SIZE / 2).toString());
                    e.dataTransfer.setData('offsetY', (GRID_SIZE / 2).toString());
                    e.dataTransfer.setData('propertyId', item.propertyId);
                    e.dataTransfer.setData('slotType', item.type);
                    e.dataTransfer.setData('sourceIndex', '');
              }}
              style={{
                    cursor: 'grab', 
                    border: '1px solid #f0f0f0',
                background: '#fff',
                borderRadius: '6px',
                    padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f0f0f0'}
                >
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    background: isProperty ? (rentLevel?.color || '#f5f5f5') : '#f6ffed',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {(() => {
                      const iconValue = Array.isArray(item.detail?.icon) ? item.detail?.icon[0] : item.detail?.icon;
                      const isUrl = iconValue && (iconValue.startsWith('http') || iconValue.startsWith('/') || iconValue.startsWith('data:'));
                      if (isUrl) return <img src={iconValue} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="logo" />;
                      return iconValue || <DragOutlined style={{ fontSize: '12px', color: '#bfbfbf' }} />;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '13px' }}>{item.name}</Text>
                      {isProperty && rentLevel && (
                        <div style={{ 
                          fontSize: '10px', 
                          padding: '0 6px', 
                          background: `${rentLevel.color}15`, 
                          color: rentLevel.color,
                          borderRadius: '10px',
                          border: `1px solid ${rentLevel.color}30`
                        }}>
                          {rentLevel.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#bfbfbf' }}>
                暂无匹配地块
              </div>
            )}
          </div>
        </div>
        
        <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
          <Space align="start">
            <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 3 }} />
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              正在编辑: <Text strong>{currentMap?.name}</Text>
              <br />
              资源库仅显示当前主题下的地块。
            </div>
          </Space>
        </div>
      </div>
    );
  };

  // 渲染地图插槽
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    
    // 获取拖拽起始时的偏移量（鼠标点击位置相对于地块左上角的距离）
    const offsetX = parseInt(e.dataTransfer.getData('offsetX') || '0');
    const offsetY = parseInt(e.dataTransfer.getData('offsetY') || '0');

    // 计算放置位置：(鼠标当前坐标 - 容器左上角坐标 + 逻辑起点坐标 - 内部偏移量)
    const rawX = (e.clientX - rect.left) + originX - offsetX;
    const rawY = (e.clientY - rect.top) + originY - offsetY;

    // 吸附到网格
    const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

    const propId = e.dataTransfer.getData('propertyId');
    const sourceIndex = e.dataTransfer.getData('sourceIndex');
    
    if (currentMap) {
      let newSlots = [...currentMap.slots];
      
      if (sourceIndex !== '') {
        // 移动已有地块
        const idx = parseInt(sourceIndex);
        newSlots[idx] = { ...newSlots[idx], x, y };
      } else if (propId) {
        // 新增地块：严格从 properties 匹配
        const prop = properties.find(p => p.id === propId);
        if (prop) {
          // 映射地块类型到 MapSlot 要求的类型
          let slotType: any = prop.type;
          if (['normal', 'station', 'utility'].includes(prop.type)) {
            slotType = 'property';
          }
          
          const newSlot: any = { 
            x, 
            y, 
            type: slotType,
            propertyId: prop.id,
            name: prop.name,
            icon: prop.icon
          };
          // 过滤掉 empty 占位符
          newSlots = newSlots.filter(s => s.type !== 'empty');
          newSlots.push(newSlot);
        }
      }
      
      updateMapWithHistory({ ...currentMap, slots: newSlots });
    }
  };

  const renderSlot = (index: number) => {
    const slot = currentMap?.slots[index];
    if (!slot || slot.type === 'empty') return null;
    
    const typeConfig: Record<string, { color: string, bg: string, label: string }> = {
      empty: { color: '#d9d9d9', bg: '#fafafa', label: '空' },
      property: { color: '#1890ff', bg: '#ffffff', label: '土地' },
      normal: { color: '#1890ff', bg: '#ffffff', label: '土地' },
      station: { color: '#595959', bg: '#ffffff', label: '车站' },
      utility: { color: '#faad14', bg: '#ffffff', label: '公用' },
      start: { color: '#52c41a', bg: '#f6ffed', label: '起点' },
      jail: { color: '#ff4d4f', bg: '#fff1f0', label: '监狱' },
      fate: { color: '#722ed1', bg: '#f9f0ff', label: '命运' },
      chance: { color: '#fa8c16', bg: '#fff7e6', label: '机会' }
    };

    const config = typeConfig[slot.type] || typeConfig.empty;
    // 获取关联地块的颜色（如果是普通土地）
    const prop = properties.find(p => p.id === slot.propertyId);
    const rentLevel = rentLevels.find(r => r.id === prop?.rentLevelId);
    const headerColor = rentLevel?.color || config.color;
    const isCustomProperty = slot.type === 'property';
    
    return (
      <div 
        key={index}
        draggable
        onDragStart={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
          e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
          e.dataTransfer.setData('sourceIndex', index.toString());
          e.dataTransfer.setData('slotType', slot.type);
        }}
        style={{
          width: GRID_SIZE,
          height: GRID_SIZE,
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          position: 'absolute',
          left: (slot.x || 0) - originX,
          top: (slot.y || 0) - originY,
          textAlign: 'center',
          transition: 'all 0.2s ease',
          cursor: 'move',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          border: '1.5px solid rgba(0,0,0,0.15)' // 更加突出的地块边界
        }}
      >
        {/* 序号标记 */}
            <div style={{ 
          fontSize: '9px', 
          color: 'rgba(0,0,0,0.3)', 
          position: 'absolute', 
          top: 2, 
          left: 4, 
          zIndex: 6,
          fontWeight: 600
        }}>
          #{index + 1}
            </div>

        {/* 删除按钮 */}
            <Button 
              type="text" 
              size="small" 
          danger
              icon={<DeleteOutlined style={{ fontSize: '10px' }} />} 
          style={{ 
            position: 'absolute', 
            top: 2, 
            right: 2, 
            height: '18px', 
            width: '18px', 
            minWidth: '18px', 
            background: 'rgba(0,0,0,0.05)', 
            borderRadius: '3px', 
            padding: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            color: '#ff4d4f'
          }}
          onClick={(e) => {
            e.stopPropagation();
                const newSlots = [...(currentMap?.slots || [])];
            newSlots.splice(index, 1);
            updateMapWithHistory({ ...currentMap!, slots: newSlots });
          }}
        />

        {/* 主体 Logo 区域 - 撑满 */}
        <div style={{ 
          flex: 1, 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 0,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {!isCustomProperty && slot.icon ? (() => {
            const iconValue = Array.isArray(slot.icon) ? slot.icon[0] : slot.icon;
            const isUrl = iconValue && (iconValue.startsWith('http') || iconValue.startsWith('/') || iconValue.startsWith('data:'));
            
            const iconImgStyle: React.CSSProperties = {
              width: '100%', 
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none'
            };

            return (
              <div style={{ width: '100%', height: '100%' }}>
                {isUrl ? (
                  <img src={iconValue} style={iconImgStyle} alt="logo" />
                ) : iconValue && iconValue.trim().startsWith('<svg') ? (
                  <div 
                    style={{ ...iconImgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    dangerouslySetInnerHTML={{ __html: iconValue }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    {iconValue}
                  </div>
                )}
              </div>
            );
          })() : (
            !isCustomProperty && <div style={{ fontSize: '24px', opacity: 0.1 }}>{config.label[0]}</div>
          )}
        </div>

        {/* 底部名称浮层 */}
        <div style={{ 
          width: '100%', 
          height: '24px', 
          background: headerColor, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 5,
          padding: '0 2px'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#fff', 
            fontWeight: 'bold', 
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
          }}>
            {slot.name}
          </div>
        </div>
      </div>
    );
  };

  if (isEditorOpen) {
    return (
      <Layout style={{ height: 'calc(100vh - 110px)', background: '#fff' }}>
        <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          {renderLibrary()}
        </Sider>
        <Content style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', background: '#fff', zIndex: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={16}>
              <Button icon={<ArrowLeftOutlined />} onClick={handleCloseEditor}>返回列表</Button>
              <Title level={4} style={{ margin: 0 }}>地图编辑: {currentMap?.name}</Title>
            </Space>
              <Space>
                <Text type="secondary">提示: 拖拽左侧地块到网格中，可自由移动地块</Text>
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={handleUndo} 
                  disabled={history.length === 0}
                >
                  撤销
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  onClick={handleSaveEditor}
                  loading={isSaving}
                >
                  保存地图布局
                </Button>
              </Space>
            </div>
          </div>
          
          <div 
            style={{ 
              flex: 1,
              overflow: 'auto',
              padding: '100px', // 给予四周足够的空间
              background: '#f0f2f5'
            }}
          >
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{ 
                width: canvasWidth,
                height: canvasHeight,
                position: 'relative',
                backgroundColor: '#fff',
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px),
                  conic-gradient(#f5f5f5 25%, transparent 0 50%, #f5f5f5 0 75%, transparent 0)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, 40px 40px`,
                boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                border: '1px solid #d9d9d9',
                borderRadius: '4px'
              }}
            >
              {currentMap?.slots.map((_, i) => renderSlot(i))}
            </div>
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
      title: '地块数量', 
      key: 'slotCount',
      render: (record: Map) => <Tag color="blue">{record.slots?.filter(s => s.type !== 'empty').length || 0} 格</Tag>
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


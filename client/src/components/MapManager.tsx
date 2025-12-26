import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Table, Button, Modal, Form, Input, InputNumber, 
  Space, Tag, Select, Typography, 
  Popconfirm, Tabs, Layout, App, Segmented, Tooltip
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
  ArrowRightOutlined,
  UndoOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { type Map, type MapSlot, MapService, SnapshotService, type MapSnapshot } from '../services/MapService';
import { type Theme, ThemeService } from '../services/ThemeService';
import { type Property, PropertyService } from '../services/PropertyService';
import { type RentLevel, RentLevelService } from '../services/RentLevelService';
import { CardService } from '../services/CardService';

const { Content, Sider } = Layout;
const { Text, Title, Paragraph } = Typography;

const GRID_SIZE = 80;

const typeConfig: Record<string, { color: string, bg: string, label: string }> = {
  empty: { color: '#d9d9d9', bg: '#fafafa', label: '空' },
  property: { color: '#1890ff', bg: '#ffffff', label: '土地' },
  station: { color: '#595959', bg: '#ffffff', label: '车站' },
  utility: { color: '#faad14', bg: '#ffffff', label: '公用' },
  start: { color: '#52c41a', bg: '#f6ffed', label: '起点' },
  jail: { color: '#ff4d4f', bg: '#fff1f0', label: '监狱' },
  fate: { color: '#722ed1', bg: '#f9f0ff', label: '命运' },
  chance: { color: '#fa8c16', bg: '#fff7e6', label: '机会' },
  tax: { color: '#8c8c8c', bg: '#f5f5f5', label: '税收' },
  chest: { color: '#eb2f96', bg: '#fff0f6', label: '宝箱' }
};

const typeColors: Record<string, string> = {
  start: '#52c41a',
  jail: '#ff4d4f',
  fate: '#722ed1',
  chance: '#fa8c16',
  station: '#595959',
  utility: '#faad14',
  property: '#1890ff',
  tax: '#8c8c8c',
  chest: '#eb2f96'
};

const MapManager: React.FC = () => {
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [maps, setMaps] = useState<Map[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentLevels, setRentLevels] = useState<RentLevel[]>([]);
  const [snapshots, setSnapshots] = useState<MapSnapshot[]>([]);
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
  const [showArrows, setShowArrows] = useState(true);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // 动画样式
  useEffect(() => {
    const styleId = 'map-animation-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes breath-single {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.12); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0.2; }
        }
        .potential-exit {
          animation: breath-single 2s infinite ease-in-out;
          transform-origin: center;
          transform-box: fill-box;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // 画板变换状态
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // 监听空格键状态
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 优化平移逻辑：使用 window 监听器确保拖动顺滑
  useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, lastMousePos]);

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
        // 确保 ID 补齐
        const mapCopy = JSON.parse(JSON.stringify(targetMap));
        mapCopy.slots = mapCopy.slots.map((slot: any, idx: number) => ({
          ...slot,
          id: slot.id || `slot-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
        }));
        setCurrentMap(mapCopy);
        setIsEditorOpen(true);
        setHistory([]);
      }
    }
  }, [maps]); // 仅在地图数据加载完成后校验一次

  const fetchData = async () => {
    try {
      const [mapsData, themesData, propsData, rentLevelsData, snapshotsData] = await Promise.all([
        MapService.getAll().catch(() => []),
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => []),
        RentLevelService.getAll().catch(() => []),
        SnapshotService.getAll().catch(() => [])
      ]);
      const fetchedMaps = Array.isArray(mapsData) ? mapsData : [];
      setMaps(fetchedMaps);
      setThemes(Array.isArray(themesData) ? themesData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);
      setRentLevels(Array.isArray(rentLevelsData) ? rentLevelsData : []);
      setSnapshots(Array.isArray(snapshotsData) ? snapshotsData : []);
      
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

  // 辅助函数：根据规则重排地块顺序
  const reorderSlots = (slots: any[]) => {
    if (!slots || slots.length <= 1) return slots || [];
    
    const activeSlots = slots.filter(s => s && s.type !== 'empty');
    if (activeSlots.length === 0) return slots;

    // 1. 寻找起点，如果没有起点则默认使用第一个地块作为根
    let startIdx = activeSlots.findIndex(s => s && s.type === 'start');
    if (startIdx === -1) startIdx = 0; 

    // 2. 将选定的根节点移到第一位
    const newOrder: any[] = [];
    const remaining = [...activeSlots];
    const startSlot = remaining.splice(startIdx, 1)[0];
    if (!startSlot) return slots;
    newOrder.push(startSlot);

    // 3. 启发式邻近排序：尝试沿着逻辑连接或物理相邻关系寻找下一个地块
    let current = startSlot;
    while (remaining.length > 0) {
      // 优先寻找显式指定的逻辑连接
      let nextIdx = -1;
      if (current.nextSlotId) {
        nextIdx = remaining.findIndex(s => s && s.id === current.nextSlotId);
      }

      // 如果没有逻辑连接，则寻找物理邻居
      if (nextIdx === -1) {
        nextIdx = remaining.findIndex(s => {
          if (!s) return false;
          const dx = Math.abs((s.x || 0) - (current.x || 0));
          const dy = Math.abs((s.y || 0) - (current.y || 0));
          // 仅十字相邻，放宽判定范围到 10 像素
          return (Math.abs(dx - GRID_SIZE) < 10 && dy < 10) || 
                 (Math.abs(dy - GRID_SIZE) < 10 && dx < 10);
        });
      }

      if (nextIdx !== -1) {
        current = remaining.splice(nextIdx, 1)[0];
        if (current) newOrder.push(current);
      } else {
        // 找不到连接了，将剩下的直接追加到末尾（断裂路径）
        newOrder.push(...remaining);
        break;
      }
    }

    return newOrder;
  };

  // 辅助函数：路径全局连通性自愈系统
  const healPath = (slots: MapSlot[]) => {
    const activeSlots = slots.filter(s => s && s.type !== 'empty');
    const startSlot = activeSlots.find(s => {
      const p = properties.find(prop => prop.id === s.propertyId);
      return p ? p.type === 'start' : s.type === 'start';
    });
    if (!startSlot) return slots;

    const visited = new Set<string>();
    let cursor: MapSlot | undefined = startSlot;
    const startId = cursor.id;
    let iterations = 0;
    const MAX_PATH_LENGTH = 100;

    // 每次扫描前，先备份一份 slots 用于查找，避免在循环中直接修改导致查找不到
    const findSlot = (id: string) => slots.find(s => s && s.id === id);

    while (cursor && iterations < MAX_PATH_LENGTH) {
      iterations++;
      visited.add(cursor.id);
      
      // 尝试寻找下一个逻辑连接
      let next: MapSlot | undefined = cursor.nextSlotId ? findSlot(cursor.nextSlotId) : undefined;
      
      // 如果物理上断开了，则强制清除逻辑连接
      if (next) {
        const dx = Math.abs((next.x || 0) - (cursor.x || 0));
        const dy = Math.abs((next.y || 0) - (cursor.y || 0));
        const isAdjacent = (Math.abs(dx - GRID_SIZE) < 10 && dy < 10) || (Math.abs(dy - GRID_SIZE) < 10 && dx < 10);
        if (!isAdjacent) {
          const idx = slots.findIndex(s => s && s.id === cursor!.id);
          if (idx !== -1) {
            slots[idx] = { ...slots[idx], nextSlotId: undefined };
            cursor = slots[idx]; // 同步最新的 cursor
          }
          next = undefined;
        }
      }
      
      // 如果当前没有逻辑出口，尝试寻找合适的邻居自动握手
      if (!next) {
        const neighbors = activeSlots.filter(s => {
          if (!s) return false;
          const dx = Math.abs((s.x || 0) - (cursor!.x || 0));
          const dy = Math.abs((s.y || 0) - (cursor!.y || 0));
          const isAdj = (Math.abs(dx - GRID_SIZE) < 10 && dy < 10) || (Math.abs(dy - GRID_SIZE) < 10 && dx < 10);
          
          if (!isAdj) return false;

          // 特殊规则：允许连回起点形成闭合回路（至少需要3个地块才能成环）
          if (s.type === 'start' && visited.size >= 3) return true;
          
          // 排除已经访问过的节点
          return !visited.has(s.id);
        });
        
        let selectedNeighbor = null;
        if (neighbors.length === 1) {
          selectedNeighbor = neighbors[0];
        } else if (neighbors.length > 1) {
          // 如果有多个邻居，优先选择起点以形成闭环
          const startNeighbor = neighbors.find(n => n.type === 'start');
          if (startNeighbor) {
            selectedNeighbor = startNeighbor;
          }
        }

        if (selectedNeighbor) {
          const idx = slots.findIndex(s => s && s.id === cursor!.id);
          if (idx !== -1) {
            slots[idx] = { ...slots[idx], nextSlotId: selectedNeighbor.id };
            next = selectedNeighbor;
            cursor = slots[idx]; // 同步最新的 cursor
          }
        }
      }
      
      // 步进到下一格（如果回到起点，则终止循环）
      if (next && next.id !== startId && !visited.has(next.id)) {
        cursor = next;
      } else {
        cursor = undefined;
      }
    }
    return slots;
  };

  const handleOpenEditor = (map: Map) => {
    // 确保所有地块都有唯一 ID（如果缺失则补齐）
    const mapCopy = JSON.parse(JSON.stringify(map));
    mapCopy.slots = mapCopy.slots.map((slot: any, idx: number) => ({
      ...slot,
      id: slot.id || `slot-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    setCurrentMap(mapCopy);
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
      message.success('保存成功（草稿已更新）');
      setHistory([]); // 保存后清空历史，消除未保存警告
      fetchData();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSnapshot = async () => {
    if (!currentMap) return;
    
    // --- 导出前置校验：连通性检查 ---
    const activeSlots = currentMap.slots.filter(s => s && s.type !== 'empty');
    const startSlot = activeSlots.find(s => {
      const p = properties.find(prop => prop.id === s.propertyId);
      return p ? p.type === 'start' : s.type === 'start';
    });

    if (!startSlot) {
      message.error('导出失败：地图必须包含一个“起点”地块');
      return;
    }

    const visited = new Set<string>();
    let cursor: MapSlot | undefined = startSlot;
    const startId = startSlot.id;
    let iterations = 0;
    
    // 模拟路径遍历
    while (cursor && iterations < 200) {
      iterations++;
      visited.add(cursor.id);
      const nextId: string | undefined = cursor.nextSlotId;
      // 如果有下一个节点，且不是起点（环路），且没访问过（防死循环）
      if (nextId && nextId !== startId && !visited.has(nextId)) {
        cursor = activeSlots.find(s => s.id === nextId);
      } else {
        cursor = undefined;
      }
    }

    if (visited.size < activeSlots.length) {
      const orphanCount = activeSlots.length - visited.size;
      message.warning(`导出中止：地图中存在 ${orphanCount} 个未连通的地块。请确保所有放置的地块都通过路径相互连接。`);
      return;
    }
    
    const mapSnapshots = snapshots.filter(s => s.mapId === currentMap.id);
    const nextVersionNum = mapSnapshots.length + 1;
    let versionStr = `v${nextVersionNum}`;

    modal.confirm({
      title: '导出独立游玩快照',
      icon: <CloudUploadOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>地图名称 (不可修改):</Text>
              <Input value={currentMap.name} disabled style={{ marginTop: 4 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>版本号 / 标识:</Text>
              <Input 
                defaultValue={versionStr} 
                onChange={(e) => { versionStr = e.target.value; }}
                placeholder="例如: v1 或 圣诞平衡版"
                style={{ marginTop: 4 }}
              />
            </div>
          </Space>
        </div>
      ),
      okText: '确定导出',
      cancelText: '取消',
      onOk: async () => {
        try {
          const snapshotName = currentMap.name;
          // ... 1. 准备核心元数据
          const theme = themes.find(t => t.id === currentMap.themeId);
          const snapshotProperties = properties.filter(p => p.themeId === currentMap.themeId || p.isDefault);
          const snapshotRentLevels = rentLevels.filter(r => r.themeId === currentMap.themeId);
          
          const allCards = await CardService.getAll().catch(() => []);
          const themeCards = allCards.filter(c => c.themeId === currentMap.themeId);

          const redundantSlots = currentMap.slots.map(slot => {
            const p = properties.find(prop => prop.id === slot.propertyId);
            const rl = rentLevels.find(r => r.id === p?.rentLevelId);
            return {
              ...slot,
              name: p?.name || slot.name,
              icon: p?.icon || (slot as any).icon,
              price: p?.price,
              headerColor: rl?.color || (p ? typeColors[p.type] : typeConfig[slot.type || 'property']?.color)
            };
          });

          await SnapshotService.save({
            mapId: currentMap.id,
            name: snapshotName,
            version: versionStr,
            themeId: currentMap.themeId,
            theme,
            rentLevels: snapshotRentLevels,
            properties: snapshotProperties,
            cards: themeCards,
            slots: redundantSlots
          });
          
          message.success('独立快照已导出');
          fetchData();
        } catch (error) {
          console.error('Export error:', error);
          message.error('导出快照失败');
        }
      }
    });
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(3, ${GRID_SIZE}px)`, 
            gap: '8px', 
            justifyContent: 'center' 
          }}>
            {filteredItems.length > 0 ? filteredItems.map((item) => {
              const rentLevel = rentLevels.find(r => r.id === item.detail?.rentLevelId);
              const headerColor = rentLevel?.color || typeColors[item.type] || '#1890ff';

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
                    width: GRID_SIZE,
                    height: GRID_SIZE,
                border: '1px solid #f0f0f0',
                    background: `linear-gradient(${headerColor}15, ${headerColor}15), #fff`,
                    borderRadius: '4px',
                display: 'flex',
                    flexDirection: 'column',
                alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = headerColor;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${headerColor}20`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* 价格标签 - 左上角 */}
                  {item.detail?.price && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 4, 
                      left: 4, 
                      fontSize: '9px', 
                      color: headerColor,
                      background: 'rgba(255,255,255,0.9)',
                      padding: '0 4px',
                      borderRadius: '2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      fontWeight: 'bold',
                      zIndex: 15,
                      border: `1px solid ${headerColor}30`,
                      pointerEvents: 'none'
                    }}>
                      ${item.detail.price.toLocaleString()}
              </div>
                  )}

                  {/* Logo 区域 */}
                  <div style={{ 
                    flex: 1, 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '4px'
                  }}>
                    {(() => {
                      const iconValue = Array.isArray(item.detail?.icon) ? item.detail?.icon[0] : item.detail?.icon;
                      const isUrl = iconValue && (iconValue.startsWith('http') || iconValue.startsWith('/') || iconValue.startsWith('data:'));
                      
                      const iconStyle: React.CSSProperties = {
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      };

                      if (isUrl) {
                        return <img src={iconValue} style={{ ...iconStyle, objectFit: 'contain' }} alt="logo" />;
                      } else if (iconValue && iconValue.trim().startsWith('<svg')) {
                        return (
                          <div 
                            style={iconStyle}
                            dangerouslySetInnerHTML={{ __html: iconValue }}
                          />
                        );
                      }
                      return (
                        <div style={{ ...iconStyle, fontSize: '20px', color: '#bfbfbf', opacity: 0.3 }}>
                          {iconValue}
            </div>
                      );
                    })()}
                  </div>
                  
                  {/* 名称底色条 */}
                  <div style={{ 
                    width: '100%', 
                    height: '20px', 
                    background: headerColor, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 -1px 2px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      fontSize: '9px', 
                      color: '#fff', 
                      fontWeight: 'bold', 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'center',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      {item.name}
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
    
    // 获取拖拽起始时的偏移量（此时已统一为逻辑网格单位）
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');

    // 精准计算放置的世界坐标：
    // (鼠标屏幕坐标 - 画板容器屏幕坐标) / 缩放比例 + 逻辑原点 - 点击时的偏移量
    // 注意：rect.left 已经包含了 panOffset.x，所以不需要再次减去 panOffset
    const rawX = (e.clientX - rect.left) / zoom + originX - offsetX;
    const rawY = (e.clientY - rect.top) / zoom + originY - offsetY;

    // 吸附到网格
    const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

    const propId = e.dataTransfer.getData('propertyId');
    const sourceIndex = e.dataTransfer.getData('sourceIndex');
    
    if (currentMap) {
      let newSlots = [...currentMap.slots];
      const targetSlotIndex = newSlots.findIndex(s => s && s.x === x && s.y === y && s.type !== 'empty');

      if (sourceIndex !== '') {
        // 移动已有地块
        const idx = parseInt(sourceIndex);
        if (newSlots[idx]) {
          if (targetSlotIndex !== -1 && targetSlotIndex !== idx) {
            // 目标位置已有地块：执行交换位置
            const originalX = newSlots[idx].x;
            const originalY = newSlots[idx].y;
            newSlots[targetSlotIndex] = { ...newSlots[targetSlotIndex], x: originalX, y: originalY };
          }
          newSlots[idx] = { ...newSlots[idx], x, y };
        }
      } else if (propId) {
        // 新增地块
        if (targetSlotIndex !== -1) {
          const shiftDirections = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
            { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
          ];
          
          let foundEmpty = false;
          for (let radius = 1; radius <= 3; radius++) {
            for (const d of shiftDirections) {
              const nx = x + d.dx * radius * GRID_SIZE;
              const ny = y + d.dy * radius * GRID_SIZE;
              if (!newSlots.some(s => s && s.x === nx && s.y === ny && s.type !== 'empty')) {
                newSlots[targetSlotIndex] = { ...newSlots[targetSlotIndex], x: nx, y: ny };
                foundEmpty = true;
                break;
              }
            }
            if (foundEmpty) break;
          }
        }

        const prop = properties.find(p => p.id === propId);
        if (prop) {
          const newId = `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newSlot: MapSlot = { 
            id: newId,
            x, 
            y, 
            propertyId: prop.id
          };
          newSlots = newSlots.filter(s => s && s.type !== 'empty');
          newSlots.push(newSlot);
        }
      }

      // 执行路径自愈并记录历史
      updateMapWithHistory({ ...currentMap, slots: reorderSlots(healPath(newSlots)) });
    }
  };

  const renderSlot = (index: number) => {
    if (!currentMap || !currentMap.slots) return null;
    const slot = currentMap.slots[index];
    if (!slot || slot.type === 'empty' || !slot.id) return null;
    
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

    // 获取关联地块的详细信息
    const prop = properties.find(p => p.id === slot.propertyId);
    const rentLevel = rentLevels.find(r => r.id === prop?.rentLevelId);

    // 确定展示类型：优先使用地块模型定义的类型
    const effectiveType = prop ? (prop.type === 'normal' ? 'property' : prop.type) : (slot.type || 'property');
    const config = typeConfig[effectiveType] || typeConfig.empty;
    
    // 颜色优先级：收益等级颜色 > 地块类型颜色 > 配置默认颜色
    const typeColors: Record<string, string> = {
      start: '#52c41a', jail: '#ff4d4f', fate: '#722ed1', chance: '#fa8c16', station: '#595959', utility: '#faad14', property: '#1890ff', normal: '#1890ff'
    };
    
    // 如果没有关联地块，则判定为手动双击添加的“空白格”
    const isBlankManual = !slot.propertyId;
    const headerColor = isBlankManual ? '#d9d9d9' : (rentLevel?.color || (prop ? typeColors[prop.type] : config.color) || '#d9d9d9');
    
    return (
      <div 
        key={slot.id}
        data-slot="true"
        draggable
        onDragStart={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          // 将屏幕像素偏移转换为世界坐标系下的偏移（即不随缩放改变的网格单位）
          e.dataTransfer.setData('offsetX', ((e.clientX - rect.left) / zoom).toString());
          e.dataTransfer.setData('offsetY', ((e.clientY - rect.top) / zoom).toString());
          e.dataTransfer.setData('sourceIndex', index.toString());
          e.dataTransfer.setData('slotType', effectiveType);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSlotIndex(selectedSlotIndex === index ? null : index);
        }}
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
          textAlign: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // 增加平滑动画
          cursor: 'pointer',
          zIndex: selectedSlotIndex === index ? 30 : 10,
          boxShadow: selectedSlotIndex === index 
            ? `0 0 0 3px #1890ff, 0 4px 12px rgba(0,0,0,0.2)` 
            : '0 2px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          border: isBlankManual 
            ? (selectedSlotIndex === index ? 'none' : '1.5px dashed rgba(0,0,0,0.1)')
            : (selectedSlotIndex === index ? 'none' : '1.5px solid rgba(0,0,0,0.15)'),
          flexShrink: 0
        }}
      >
        {/* 价格标签 - 左上角 */}
        {!isBlankManual && prop?.price && (
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${headerColor}30`,
            zIndex: 15,
            pointerEvents: 'none'
          }}>
            ${prop.price.toLocaleString()}
            </div>
        )}

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
            background: 'rgba(255,255,255,0.7)', 
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
            if (!currentMap || !currentMap.slots) return;
            const deletedSlot = currentMap.slots[index];
            if (!deletedSlot) return;
            const newSlots = currentMap.slots
              .filter((_, idx) => idx !== index)
              .map(s => s && s.nextSlotId === deletedSlot.id ? { ...s, nextSlotId: undefined } : s);
            // 关键修复：删除地块后重新执行路径自愈
            updateMapWithHistory({ ...currentMap, slots: reorderSlots(healPath(newSlots)) });
          }}
        />

        {/* Logo 区域 */}
        <div style={{ 
          flex: 1, 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '4px',
          zIndex: 1
        }}>
          {(() => {
            const iconValue = prop?.icon;
            if (!iconValue) return null;
            
            const firstIcon = Array.isArray(iconValue) ? iconValue[0] : iconValue;
            const isUrl = typeof firstIcon === 'string' && (firstIcon.startsWith('http') || firstIcon.startsWith('/') || firstIcon.startsWith('data:'));
            
            const iconStyle: React.CSSProperties = {
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            };

            if (isUrl) {
              return <img src={firstIcon} style={{ ...iconStyle, objectFit: 'contain' }} alt="logo" />;
            } else if (typeof firstIcon === 'string' && firstIcon.trim().startsWith('<svg')) {
              return (
                <div 
                  style={iconStyle}
                  dangerouslySetInnerHTML={{ __html: firstIcon }}
                />
              );
            }
            return null;
          })()}
        </div>

        {/* 底部名称底色条 */}
        {!isBlankManual && (
          <div style={{ 
            width: '100%', 
            height: '20px', 
            background: headerColor, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
            zIndex: 5
          }}>
            <div style={{ 
              fontSize: '9px', 
              color: '#fff', 
              fontWeight: 'bold', 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              {prop?.name || slot.name || (isBlankManual ? '空白格' : '')}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleConnect = (fromId: string, toId: string) => {
    if (!currentMap || !fromId || !toId || fromId === toId) return;
    
    const newSlots = currentMap.slots.map(s => {
      // 核心改进：互斥逻辑
      // 如果目标地块当前正指向发起地块，则强制清除目标地块的出口
      if (s.id === toId && s.nextSlotId === fromId) {
        return { ...s, nextSlotId: undefined };
      }
      // 设置发起地块的出口
      if (s.id === fromId) {
        return { ...s, nextSlotId: toId };
      }
      return s;
    });
    
    // 只更新数据，不重新排列数组顺序，避免影响其他地块的默认出口
    updateMapWithHistory({ ...currentMap, slots: newSlots });
    message.success('已指定出口');
  };

  const renderArrows = () => {
    if (!showArrows || !currentMap) return null;

    const getSlotInfoAt = (x: number, y: number) => {
      if (!currentMap || !currentMap.slots) return null;
      const idx = currentMap.slots.findIndex(s => 
        s && 
        Math.abs((s.x || 0) - x) < 5 && 
        Math.abs((s.y || 0) - y) < 5 && 
        s.type !== 'empty'
      );
      return idx !== -1 ? { slot: currentMap.slots[idx], index: idx } : null;
    };

    const directions = [
      { dx: GRID_SIZE, dy: 0, unitX: 1, unitY: 0 },
      { dx: -GRID_SIZE, dy: 0, unitX: -1, unitY: 0 },
      { dx: 0, dy: GRID_SIZE, unitX: 0, unitY: 1 },
      { dx: 0, dy: -GRID_SIZE, unitX: 0, unitY: -1 }
    ];

    // 1. 寻找路径链
    const pathIds = new Set<string>();
    const pathChain: { from: MapSlot, to: MapSlot, dir: typeof directions[0] }[] = [];
    
    // 找到起点
    let currentSlot = currentMap.slots.find(s => {
      const p = properties.find(prop => prop.id === s.propertyId);
      return p ? p.type === 'start' : s.type === 'start';
    });
    let pathEnd = currentSlot;

    if (currentSlot) {
      pathIds.add(currentSlot.id);
      let loopCount = 0;
      const MAX_PATH = 200;
      
      while (currentSlot?.nextSlotId && loopCount < MAX_PATH) {
        loopCount++;
        const nextId: string = currentSlot.nextSlotId;
        const nextSlot: MapSlot | undefined = currentMap.slots.find(s => s && s.id === nextId);
        
        if (nextSlot) {
          // 判定方向
          const dx = (nextSlot.x || 0) - (currentSlot.x || 0);
          const dy = (nextSlot.y || 0) - (currentSlot.y || 0);
          const dir = directions.find(d => Math.abs(d.dx - dx) < 10 && Math.abs(d.dy - dy) < 10);
          
          if (dir) {
            pathChain.push({ from: currentSlot, to: nextSlot, dir });
            
            // 如果连回了已访问的地块（形成闭环）
            if (pathIds.has(nextSlot.id)) {
              pathEnd = undefined; // 闭合路径不需要末端律动
              break;
            }
            
            pathIds.add(nextSlot.id);
            currentSlot = nextSlot;
            pathEnd = nextSlot;
          } else {
            break; // 不相邻，路径中断
          }
        } else {
          break; // 找不到，路径中断
        }
      }
    }

    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
        {/* A. 渲染已确认的路径 (红色通道) */}
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
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,77,79,0.6))' }}
              />
              {/* 指向性箭头 */}
              <polygon 
                points={`
                  ${gapX + link.dir.unitX * 3},${gapY + link.dir.unitY * 3} 
                  ${gapX - link.dir.unitX * 2 + link.dir.unitY * 4},${gapY - link.dir.unitY * 2 - link.dir.unitX * 4} 
                  ${gapX - link.dir.unitX * 2 - link.dir.unitY * 4},${gapY - link.dir.unitY * 2 + link.dir.unitX * 4}
                `}
                fill="#ff4d4f"
              />
            </g>
          );
        })}

        {/* B. 渲染路径末端的潜在出口 (蓝色律动) */}
        {pathEnd && directions.map((dir, dIdx) => {
          const neighborInfo = getSlotInfoAt((pathEnd!.x || 0) + dir.dx, (pathEnd!.y || 0) + dir.dy);
          
          // 1. 检查是否已经是已确认的出口（防止在已有红色的地方显示蓝色）
          const isOutgoing = pathChain.some(link => 
            link.from.id === pathEnd!.id && 
            Math.abs(link.dir.dx - dir.dx) < 5 && 
            Math.abs(link.dir.dy - dir.dy) < 5
          );
          if (isOutgoing) return null;

          // 2. 核心修复：检查是否是当前路径的入口（防止在来路显示蓝色）
          const isIncoming = pathChain.some(link => 
            link.to.id === pathEnd!.id && 
            Math.abs(link.dir.dx + dir.dx) < 5 && 
            Math.abs(link.dir.dy + dir.dy) < 5
          );
          if (isIncoming) return null;

          const sX = (pathEnd!.x || 0) - originX + GRID_SIZE / 2;
          const sY = (pathEnd!.y || 0) - originY + GRID_SIZE / 2;
          const half = GRID_SIZE / 2;
          const gapX = sX + dir.unitX * half;
          const gapY = sY + dir.unitY * half;
          const rectW = dir.unitX ? 8 : GRID_SIZE - 8;
          const rectH = dir.unitY ? 8 : GRID_SIZE - 8;

          return (
            <g 
              key={`potential-${pathEnd!.id}-${dIdx}`}
              style={{ cursor: neighborInfo ? 'pointer' : 'default', pointerEvents: neighborInfo ? 'auto' : 'none' }}
              onClick={(e) => {
                if (neighborInfo) {
                  e.stopPropagation();
                  handleConnect(pathEnd!.id!, neighborInfo.slot.id!);
                }
              }}
            >
              <rect
                className="potential-exit"
                x={gapX - rectW / 2}
                y={gapY - rectH / 2}
                width={rectW}
                height={rectH}
                fill="#1890ff"
                rx={2}
                style={{ 
                  filter: 'drop-shadow(0 0 6px rgba(24,144,255,0.8))'
                }}
              />
              {/* 指向箭头 */}
              <polygon 
                points={`
                  ${gapX + dir.unitX * 3},${gapY + dir.unitY * 3} 
                  ${gapX - dir.unitX * 2 + dir.unitY * 4},${gapY - dir.unitY * 2 - dir.unitX * 4} 
                  ${gapX - dir.unitX * 2 - dir.unitY * 4},${gapY - dir.unitY * 2 + dir.unitX * 4}
                `}
                fill="#1890ff"
                opacity={0.8}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  if (isEditorOpen) {
    return (
      <Layout style={{ 
        height: 'calc(100vh - 112px)', // 100vh - Header(64) - ContentMargin(24*2)
        background: '#fff',
        margin: -24, // 抵消父容器的 padding
        overflow: 'hidden'
      }}>
        <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
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
                <Tooltip title="显示/隐藏 路径箭头">
                  <Button 
                    icon={<ArrowRightOutlined />} 
                    type={showArrows ? "primary" : "default"}
                    onClick={() => setShowArrows(!showArrows)}
                  />
                </Tooltip>
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={handleUndo} 
                  disabled={history.length === 0}
                >
                  撤销
                </Button>
                <Button 
                  onClick={() => {
                    setZoom(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                >
                  重置视角
                </Button>
                <Button 
                  type="primary" 
                  ghost
                  icon={<CloudUploadOutlined />} 
                  onClick={handleExportSnapshot}
                >
                  导出游玩快照
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  onClick={handleSaveEditor}
                  loading={isSaving}
                >
                  保存设计草稿
                </Button>
              </Space>
            </div>
          </div>
          
          <div 
            style={{ 
              flex: 1,
              overflow: 'hidden',
              background: '#f0f2f5',
              cursor: isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'auto'),
              position: 'relative'
            }}
            onWheel={(e) => {
              e.preventDefault();
              // 缩放逻辑：改为二指上下移动 (deltaY) 触发
              if (Math.abs(e.deltaY) > 2) { // 增加微小阈值防止过于灵敏
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                const newZoom = Math.min(Math.max(zoom + delta, 0.2), 3);
                setZoom(newZoom);
              }
            }}
            onMouseDown={(e) => {
              // 检查是否点击在地块上
              const isSlot = (e.target as HTMLElement).closest('[data-slot="true"]');
              if (isSlot && e.button === 0 && !e.altKey && !isSpacePressed) {
                return; // 如果点击的是地块且没有按住辅助键，则让位给地块拖动逻辑
              }

              // 检查是否点击在背景上
              const isBg = e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-canvas="true"]');
              
              // 触发平移的条件：点击背景，或者使用了辅助键（右键、中键、Alt、空格）
              if (isBg || e.button === 1 || e.button === 2 || (e.button === 0 && (e.altKey || isSpacePressed))) { 
                setIsPanning(true);
                setLastMousePos({ x: e.clientX, y: e.clientY });
                // 防止右键菜单弹出
                if (e.button === 2) {
                  const handleContextMenu = (ce: MouseEvent) => {
                    ce.preventDefault();
                    window.removeEventListener('contextmenu', handleContextMenu);
                  };
                  window.addEventListener('contextmenu', handleContextMenu);
                }
              }
            }}
          >
            {/* 缩放倍率显示 */}
          <div style={{ 
              position: 'absolute', 
              bottom: 16, 
              right: 16, 
              zIndex: 30, 
              background: 'rgba(255,255,255,0.8)', 
              padding: '4px 8px', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#8c8c8c',
              border: '1px solid #d9d9d9',
              pointerEvents: 'none'
            }}>
              缩放: {Math.round(zoom * 100)}% | 二指上下缩放，三指移动地图
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onDoubleClick={(e) => {
                const target = e.target as HTMLElement;
                // 仅当双击的是画布背景时触发
                if (target.closest('[data-slot="true"]')) return;
                
                const container = e.currentTarget as HTMLDivElement;
                const rect = container.getBoundingClientRect();
                
                // 计算双击位置的世界坐标 (rect.left 已经包含 panOffset.x)
                const rawX = (e.clientX - rect.left) / zoom + originX;
                const rawY = (e.clientY - rect.top) / zoom + originY;
                
                // 吸附到网格中心：关键修复，减去半个网格大小以实现中心对齐
                const x = Math.round((rawX - GRID_SIZE / 2) / GRID_SIZE) * GRID_SIZE;
                const y = Math.round((rawY - GRID_SIZE / 2) / GRID_SIZE) * GRID_SIZE;
                
                if (currentMap) {
                  // 检查该位置是否已经有地块
                  const exists = currentMap.slots.some(s => s && s.x === x && s.y === y && s.type !== 'empty');
                  if (exists) return;

                  const newId = `slot-blank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  const newSlot: MapSlot = { 
                    id: newId,
                    x, 
                    y, 
                    type: 'property',
                    name: '空白格'
                  };
                  
                  const newSlots = [...currentMap.slots.filter(s => s && s.type !== 'empty'), newSlot];
                  // 关键修复：新增地块时立即执行路径评估
                  updateMapWithHistory({ ...currentMap, slots: reorderSlots(healPath(newSlots)) });
                }
              }}
              onClick={() => setSelectedSlotIndex(null)}
              data-canvas="true"
              style={{ 
                width: canvasWidth,
                height: canvasHeight,
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
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
              {renderArrows()}
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
      title: '状态', 
      key: 'status',
      render: (record: Map) => {
        const mapSnapshots = snapshots.filter(s => s.mapId === record.id);
        if (mapSnapshots.length === 0) {
          return <Tag icon={<ClockCircleOutlined />} color="default">未导出</Tag>;
        }
        // 显示最新一个快照的时间
        const latest = mapSnapshots.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
        return (
          <Space direction="vertical" size={0}>
            <Tag icon={<CheckCircleOutlined />} color="success">已发布 ({mapSnapshots.length})</Tag>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              最新: {new Date(latest.publishedAt).toLocaleString()}
            </Text>
          </Space>
        );
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
          <Form.Item 
            name="name" 
            label="地图名称" 
            rules={[{ required: true }]}
            tooltip={editingMap && snapshots.some(s => s.mapId === editingMap.id) ? "该地图已有导出的快照版本，不可修改名称" : null}
          >
            <Input 
              placeholder="例如: 经典环球之旅" 
              disabled={!!(editingMap && snapshots.some(s => s.mapId === editingMap.id))}
            />
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



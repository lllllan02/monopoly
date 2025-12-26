export interface MapSlot {
  id: string; // 地块实例的唯一 ID
  propertyId?: string; // 关联的地块模型 ID
  x?: number; // 横坐标
  y?: number; // 纵坐标
  nextSlotId?: string; // 指定的下一个地块的 ID
  type?: 'property' | 'start' | 'jail' | 'fate' | 'chance' | 'tax' | 'chest' | 'empty'; // 仅无 propertyId 时记录
  name?: string; // 仅无 propertyId 时记录
}

export interface Map {
  id: string;
  name: string;
  themeId: string;
  size: number;
  slots: MapSlot[]; // 设计中的草稿，仅保留逻辑关联
}

export interface MapSnapshot {
  id: string; // 快照唯一 ID
  mapId: string; // 源地图 ID
  name: string;
  version: string; // 版本号或描述
  themeId: string;
  theme: any; // 导出的完整主题配置
  rentLevels: any[]; // 导出的完整经济等级列表
  properties: any[]; // 导出的完整地块元数据
  cards: any[]; // 导出的完整卡组
  slots: any[]; // 包含完整冗余信息的地块布局
  publishedAt: string;
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const MapService = {
  async getAll(): Promise<Map[]> {
    const res = await fetch(`${API_BASE}/maps`);
    return res.json();
  },
  
  async create(map: Omit<Map, 'id'>): Promise<Map> {
    const res = await fetch(`${API_BASE}/maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map)
    });
    return res.json();
  },
  
  async update(id: string, map: Partial<Map>): Promise<Map> {
    const res = await fetch(`${API_BASE}/maps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map)
    });
    return res.json();
  },
  
  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/maps/${id}`, {
      method: 'DELETE'
    });
  }
};

export const SnapshotService = {
  async getAll(): Promise<MapSnapshot[]> {
    const res = await fetch(`${API_BASE}/snapshots`);
    return res.json();
  },

  async getByMapId(mapId: string): Promise<MapSnapshot | null> {
    const res = await fetch(`${API_BASE}/snapshots/${mapId}`);
    return res.json();
  },

  async save(snapshot: Omit<MapSnapshot, 'publishedAt' | 'id'>): Promise<MapSnapshot> {
    const res = await fetch(`${API_BASE}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
    return res.json();
  },

  async delete(mapId: string): Promise<void> {
    await fetch(`${API_BASE}/snapshots/${mapId}`, {
      method: 'DELETE'
    });
  }
};

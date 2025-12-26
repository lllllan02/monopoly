export interface MapSlot {
  id: string; // 地块实例的唯一 ID
  type: 'property' | 'start' | 'jail' | 'fate' | 'chance' | 'tax' | 'chest' | 'empty';
  propertyId?: string; // 如果是地块，关联具体的 tile_id
  name?: string; // 显示名称
  value?: number; // 针对税收格等设置固定数值
  x?: number; // 横坐标
  y?: number; // 纵坐标
  icon?: string; // 显示图标
  nextSlotId?: string; // 指定的下一个地块的 ID
}

export interface Map {
  id: string;
  name: string;
  themeId: string;
  size: number;
  slots: MapSlot[];
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

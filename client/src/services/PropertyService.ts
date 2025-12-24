export interface Property {
  id: string;
  name: string;
  themeId: string;
  type: 'normal' | 'station' | 'utility' | 'start';
  rentLevelId?: string; // 仅普通土地使用
  price?: number;       // 购买价格（所有类型均可设置）
  houseCost?: number;   // 建设费用（仅普通土地使用）
  description?: string;
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const PropertyService = {
  async getAll(): Promise<Property[]> {
    const res = await fetch(`${API_BASE}/properties`);
    return res.json();
  },

  async create(property: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    return res.json();
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/properties/${id}`, {
      method: 'DELETE',
    });
  },
};

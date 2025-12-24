export interface Property {
  id: string;
  name: string;
  themeId: string;       // 修改为 id
  type: 'normal' | 'station' | 'utility';
  rentLevelId?: string; // 关联经济等级 (引用经济模板后，price, houseCost, rentCurve 均从此引用)
  description?: string;
  createdAt: string;
  updatedAt?: string;
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

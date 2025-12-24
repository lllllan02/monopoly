export interface RentLevel {
  id: string;
  name: string;
  themeId: string;
  color: string;
  purchasePrice: number;
  houseCost: number;
  maxHouses: number; // 新增：该等级允许建造的最大房屋数量
  rentCurve: number[]; // 长度为 maxHouses + 1 [基础, 1级, 2级, ..., N级]
  createdAt?: string;
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const RentLevelService = {
  async getAll(): Promise<RentLevel[]> {
    const res = await fetch(`${API_BASE}/rent-levels`);
    return res.json();
  },

  async create(level: Partial<RentLevel>): Promise<RentLevel> {
    const res = await fetch(`${API_BASE}/rent-levels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(level),
    });
    return res.json();
  },

  async update(id: string, level: Partial<RentLevel>): Promise<RentLevel> {
    const res = await fetch(`${API_BASE}/rent-levels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(level),
    });
    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/rent-levels/${id}`, {
      method: 'DELETE',
    });
  },
};


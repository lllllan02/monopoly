export interface Theme {
  id: string;
  name: string;
  // 车站租金系数: [拥有1座, 拥有2座, 拥有3座, 拥有4座]
  stationRent: number[];
  // 公用事业倍率: [拥有1座时的点数倍率, 拥有2座时的点数倍率]
  utilityMultipliers: number[];
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const ThemeService = {
  async getAll(): Promise<Theme[]> {
    const res = await fetch(`${API_BASE}/themes`);
    return res.json();
  },

  async create(theme: Partial<Theme>): Promise<Theme> {
    const res = await fetch(`${API_BASE}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme),
    });
    return res.json();
  },

  async update(id: string, theme: Partial<Theme>): Promise<Theme> {
    const res = await fetch(`${API_BASE}/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme),
    });
    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/themes/${id}`, {
      method: 'DELETE',
    });
  },
};

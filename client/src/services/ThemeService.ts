export interface Theme {
  id: string;
  name: string;
  createdAt?: string;
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

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/themes/${id}`, {
      method: 'DELETE',
    });
  },
};

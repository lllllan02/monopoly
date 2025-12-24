export interface Map {
  id: string;
  name: string;
  theme: string;
  size: number;
  slots: any[];
  createdAt: string;
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const MapService = {
  async getAll(): Promise<Map[]> {
    const res = await fetch(`${API_BASE}/maps`);
    return res.json();
  }
};


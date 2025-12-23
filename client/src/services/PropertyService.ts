export interface Property {
  id: string;
  name: string;
  colorGroup: string;
  price: number;
  houseCost: number;
  baseRent: number;
  rentMultipliers: number[];
  createdAt: string;
  updatedAt?: string;
}

const API_BASE = 'http://localhost:3000/api'; // 局域网调试时需修改为实际 IP

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


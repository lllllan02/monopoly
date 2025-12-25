export interface Card {
  id: string;
  themeId: string; // 关联主题
  type: 'fate' | 'chance';
  text: string;
  action: string;
  params: any;
  description: string;
}

const API_BASE = `http://${window.location.hostname}:3000/api`;

export const CardService = {
  async getAll(): Promise<Card[]> {
    const res = await fetch(`${API_BASE}/cards`);
    return res.json();
  },
  
  async create(card: Omit<Card, 'id'>): Promise<Card> {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    return res.json();
  },
  
  async update(id: string, card: Partial<Card>): Promise<Card> {
    const res = await fetch(`${API_BASE}/cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    return res.json();
  },
  
  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/cards/${id}`, {
      method: 'DELETE'
    });
  }
};


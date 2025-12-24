import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

// --- 数据库初始化 ---
const dbProperties = await JSONFilePreset('data/properties.json', { properties: [] });
const dbMaps = await JSONFilePreset('data/maps.json', { maps: [] });
const dbCards = await JSONFilePreset('data/cards.json', { cards: [] });

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- 房产库管理 API ---

app.get('/api/properties', (req, res) => {
  res.json(dbProperties.data.properties);
});

app.post('/api/properties', async (req, res) => {
  const newProperty = {
    id: uuidv4(),
    name: req.body.name || '未命名房产',
    theme: req.body.theme || '经典', // 新增：主题
    type: req.body.type || 'normal', // 新增：类型 (normal, station, utility)
    colorGroup: req.body.colorGroup || '#8c8c8c',
    price: Number(req.body.price) || 200,
    houseCost: Number(req.body.houseCost) || 50,
    baseRent: Number(req.body.baseRent) || 20,
    rentMultipliers: req.body.rentMultipliers || [1, 5, 15, 45, 80, 125],
    description: req.body.description || '', // 新增：描述
    createdAt: new Date().toISOString()
  };

  dbProperties.data.properties.push(newProperty);
  await dbProperties.write();
  res.status(201).json(newProperty);
});

app.put('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const index = dbProperties.data.properties.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ message: '房产不存在' });

  dbProperties.data.properties[index] = {
    ...dbProperties.data.properties[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  await dbProperties.write();
  res.json(dbProperties.data.properties[index]);
});

app.delete('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  dbProperties.data.properties = dbProperties.data.properties.filter(p => p.id !== id);
  await dbProperties.write();
  res.status(204).send();
});

// --- 地图与卡片 API 略 ---
app.get('/api/maps', (req, res) => res.json(dbMaps.data.maps));
app.get('/api/cards', (req, res) => res.json(dbCards.data.cards));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

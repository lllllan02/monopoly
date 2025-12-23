import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

// 初始化数据库默认值
const defaultData = { properties: [], maps: [], cards: [] };

// 使用 lowdb 的 JSONFilePreset 快速创建/读取数据库
// 注意：这会在运行目录下寻找或创建 db.json，或者我们可以指定路径
const db = await JSONFilePreset('server/data/db.json', defaultData);

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

// 获取所有房产
app.get('/api/properties', (req, res) => {
  res.json(db.data.properties);
});

// 添加新房产
app.post('/api/properties', async (req, res) => {
  const newProperty = {
    id: uuidv4(),
    name: req.body.name || '未命名房产',
    colorGroup: req.body.colorGroup || 'gray',
    price: Number(req.body.price) || 200,
    houseCost: Number(req.body.houseCost) || 50,
    baseRent: Number(req.body.baseRent) || 20,
    rentMultipliers: req.body.rentMultipliers || [1, 5, 15, 45, 80, 125], // 0-5 栋房子的租金倍率
    createdAt: new Date().toISOString()
  };

  db.data.properties.push(newProperty);
  await db.write();
  res.status(201).json(newProperty);
});

// 更新房产
app.put('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const index = db.data.properties.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: '房产不存在' });
  }

  db.data.properties[index] = {
    ...db.data.properties[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  await db.write();
  res.json(db.data.properties[index]);
});

// 删除房产
app.delete('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  db.data.properties = db.data.properties.filter(p => p.id !== id);
  await db.write();
  res.status(204).send();
});

// --- Socket 逻辑 ---
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

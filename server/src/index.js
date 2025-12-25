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
const dbThemes = await JSONFilePreset('data/themes.json', { themes: [] });
const dbRentLevels = await JSONFilePreset('data/rent_levels.json', { levels: [] });

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

// --- 辅助函数 ---
const generateId = (prefix) => `${prefix}_${uuidv4().split('-')[0]}`;

// --- 土地经济等级管理 API ---
app.get('/api/rent-levels', (req, res) => {
  res.json(dbRentLevels.data.levels);
});

app.post('/api/rent-levels', async (req, res) => {
  const newLevel = {
    id: generateId('level'),
    ...req.body
  };
  dbRentLevels.data.levels.push(newLevel);
  await dbRentLevels.write();
  res.status(201).json(newLevel);
});

app.put('/api/rent-levels/:id', async (req, res) => {
  const { id } = req.params;
  const index = dbRentLevels.data.levels.findIndex(l => l.id === id);
  if (index !== -1) {
    dbRentLevels.data.levels[index] = { 
      ...dbRentLevels.data.levels[index], 
      ...req.body
    };
    await dbRentLevels.write();
    res.json(dbRentLevels.data.levels[index]);
  } else {
    res.status(404).send('Not found');
  }
});

app.delete('/api/rent-levels/:id', async (req, res) => {
  const { id } = req.params;
  dbRentLevels.data.levels = dbRentLevels.data.levels.filter(l => l.id !== id);
  await dbRentLevels.write();
  res.status(204).send();
});

// --- 主题管理 API ---
app.get('/api/themes', (req, res) => {
  res.json(dbThemes.data.themes);
});

app.post('/api/themes', async (req, res) => {
  const themeId = generateId('theme');
  const newTheme = {
    id: themeId,
    name: req.body.name || '新主题',
    goReward: req.body.goReward || 200,
    jailRules: req.body.jailRules || {
      bailAmount: 50,
      maxTurns: 3,
      allowDoubles: true
    },
    stationRent: req.body.stationRent || [25, 50, 100, 200],
    utilityMultipliers: req.body.utilityMultipliers || [4, 10]
  };

  // 自动为新主题创建全套内置地块 (Default Tiles)
  const defaultTiles = [
    { id: generateId('tile'), name: '起点', themeId, type: 'start', isDefault: true, description: '游戏的起点，路过此地可领取奖励。' },
    { id: generateId('tile'), name: '监狱', themeId, type: 'jail', isDefault: true, description: '违规者的暂居地，停留在此将面临禁足。' },
    { id: generateId('tile'), name: '车站 A', themeId, type: 'station', isDefault: true, price: 200, description: '枢纽车站，拥有越多收益越高。' },
    { id: generateId('tile'), name: '车站 B', themeId, type: 'station', isDefault: true, price: 200, description: '枢纽车站，拥有越多收益越高。' },
    { id: generateId('tile'), name: '车站 C', themeId, type: 'station', isDefault: true, price: 200, description: '枢纽车站，拥有越多收益越高。' },
    { id: generateId('tile'), name: '车站 D', themeId, type: 'station', isDefault: true, price: 200, description: '枢纽车站，拥有越多收益越高。' },
    { id: generateId('tile'), name: '自来水厂', themeId, type: 'utility', isDefault: true, price: 150, description: '公用事业，根据骰子点数收取租金。' },
    { id: generateId('tile'), name: '电力公司', themeId, type: 'utility', isDefault: true, price: 150, description: '公用事业，根据骰子点数收取租金。' },
    { id: generateId('tile'), name: '命运', themeId, type: 'fate', isDefault: true, description: '命运格，停留在此将抽取一张命运卡。' },
    { id: generateId('tile'), name: '机会', themeId, type: 'chance', isDefault: true, description: '机会格，停留在此将抽取一张机会卡。' }
  ];

  dbThemes.data.themes.push(newTheme);
  dbProperties.data.properties.push(...defaultTiles);
  
  await Promise.all([dbThemes.write(), dbProperties.write()]);
  res.status(201).json(newTheme);
});

app.put('/api/themes/:id', async (req, res) => {
  const { id } = req.params;
  const index = dbThemes.data.themes.findIndex(t => t.id === id);
  if (index !== -1) {
    dbThemes.data.themes[index] = { 
      ...dbThemes.data.themes[index], 
      ...req.body
    };
    await dbThemes.write();
    res.json(dbThemes.data.themes[index]);
  } else {
    res.status(404).send('Not found');
  }
});

app.delete('/api/themes/:id', async (req, res) => {
  const { id } = req.params;
  dbThemes.data.themes = dbThemes.data.themes.filter(t => t.id !== id);
  await dbThemes.write();
  res.status(204).send();
});

// --- 地块管理 API ---
app.get('/api/properties', (req, res) => {
  res.json(dbProperties.data.properties);
});

app.post('/api/properties', async (req, res) => {
  const { type, isDefault } = req.body;
  
  // 强制校验：非内置创建只能是 normal 类型
  if (!isDefault && type !== 'normal') {
    return res.status(400).json({ message: '除系统内置外，自定义地块只能是普通土地类型' });
  }

  const newProperty = {
    id: generateId('tile'),
    ...req.body
  };

  dbProperties.data.properties.push(newProperty);
  await dbProperties.write();
  res.status(201).json(newProperty);
});

app.put('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const index = dbProperties.data.properties.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ message: '地块不存在' });

  dbProperties.data.properties[index] = {
    ...dbProperties.data.properties[index],
    ...req.body
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

// --- 地图 API ---
app.get('/api/maps', (req, res) => res.json(dbMaps.data.maps));

app.post('/api/maps', async (req, res) => {
  const newMap = {
    id: generateId('map'),
    ...req.body
  };
  dbMaps.data.maps.push(newMap);
  await dbMaps.write();
  res.status(201).json(newMap);
});

// --- 卡片 API ---
app.get('/api/cards', (req, res) => res.json(dbCards.data.cards));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

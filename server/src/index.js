// 服务端入口文件 - 框架搭建
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 允许局域网访问
    methods: ["GET", "POST"]
  }
});

// Socket 逻辑占位
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


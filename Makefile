# 大富翁项目快捷启动脚本

.PHONY: install server client dev clean

# 安装所有依赖
install:
	@echo "正在安装服务端依赖..."
	cd server && npm install
	@echo "正在安装客户端依赖..."
	cd client && npm install

# 启动服务端
server:
	@echo "检查并清理端口 3000..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "正在启动服务端 (http://0.0.0.0:3000)..."
	cd server && npm run dev

# 启动客户端
client:
	@echo "正在启动客户端..."
	cd client && npm run dev

# 同时启动服务端和客户端 (注意：这会在当前终端前台运行，建议分两个窗口运行或使用快捷键)
dev:
	@make -j 2 server client

# 清理 node_modules
clean:
	rm -rf server/node_modules client/node_modules


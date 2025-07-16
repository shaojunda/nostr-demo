#!/bin/bash

# Nostr Demo 启动脚本

echo "🔥 启动 Nostr Demo 项目..."

# 确保在正确的目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📂 当前目录: $(pwd)"

# 检查是否存在 package.json
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json，请确保在项目根目录运行此脚本"
    exit 1
fi

# 检查是否存在 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 检查关键依赖是否存在
if [ ! -d "node_modules/nostr-tools" ]; then
    echo "📦 重新安装依赖..."
    rm -rf node_modules package-lock.json
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo "📱 访问地址: http://localhost:8080"
echo "🛑 按 Ctrl+C 停止服务器"

npm run dev
# 🚀 快速启动指南

## 方法 1: 使用终端命令

```bash
# 进入项目目录
cd /Users/shaojunda/apps/nervina/nostr-demo

# 启动开发服务器
npm run dev
```

## 方法 2: 使用启动脚本

```bash
# 进入项目目录
cd /Users/shaojunda/apps/nervina/nostr-demo

# 运行启动脚本
./start.sh
```

## 方法 3: 分步执行

```bash
# 1. 进入项目目录
cd /Users/shaojunda/apps/nervina/nostr-demo

# 2. 检查依赖
npm run test-config

# 3. 启动开发服务器
npm run dev
```

## 如果遇到问题

### 清理并重新安装依赖
```bash
cd /Users/shaojunda/apps/nervina/nostr-demo
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 检查 Node.js 版本
```bash
node --version
npm --version
```

### 直接构建
```bash
cd /Users/shaojunda/apps/nervina/nostr-demo
npm run build
```

## 访问地址

开发服务器启动后，访问：
- http://localhost:8080

## 测试状态

✅ 所有依赖已安装
✅ 项目配置正确
✅ nostr-tools 库可用
✅ webpack 配置完整

## 功能特性

🔐 **真实加密**: 使用 secp256k1 椭圆曲线
📝 **完整功能**: 创建账号、发布、点赞、收藏、关注、评论
🌐 **多中继**: 支持多个 Nostr 中继服务器
✅ **协议兼容**: 符合标准 Nostr 协议规范
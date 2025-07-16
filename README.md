# Nostr Demo 项目

这是一个基于 Nostr 协议的去中心化社交应用演示项目，使用真实的 nostr-tools 库和 secp256k1 加密，实现了以下功能：

## 功能特性

### 🔐 用户管理
- ✅ 创建新账号 (生成密钥对)
- ✅ 导入现有账号 (通过 nsec 私钥)
- ✅ 用户资料管理

### 🌐 中继管理
- ✅ 连接到多个 Nostr 中继
- ✅ 动态添加新的中继
- ✅ 中继连接状态监控

### 📝 长文发布
- ✅ 发布长文章 (NIP-23)
- ✅ 文章标题和内容编辑
- ✅ 文章时间线显示

### 💬 社交互动
- ✅ 点赞文章 (NIP-25)
- ✅ 收藏文章 (NIP-51)
- ✅ 关注/取消关注作者 (NIP-02)
- ✅ 评论文章 (NIP-22)

### 📱 用户界面
- ✅ 响应式设计
- ✅ 直观的标签式界面
- ✅ 实时状态反馈

## 项目结构

```
nostr-demo/
├── src/
│   ├── index.html          # 主页面
│   ├── index.js            # 应用主入口
│   ├── nostr-client.js     # 真实的 Nostr 客户端实现
│   └── ui-manager.js       # UI 管理器
├── simple.html             # 简化版本（仅用于演示）
├── nostr-real.html         # 使用说明页面
├── package.json            # 项目配置
├── webpack.config.js       # Webpack 配置
├── start.sh               # 启动脚本
└── README.md              # 项目说明
```

## 快速开始

### 🔥 推荐方式（真实加密版本）

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **或者使用启动脚本**
```bash
chmod +x start.sh
./start.sh
```

4. **在浏览器中访问**
```
http://localhost:8080
```

### 📝 简化演示版本

如果只是想快速体验功能（不需要真实加密），可以直接打开：
```bash
open simple.html
```

### 🏗️ 构建生产版本
```bash
npm run build
npm start
```

## 使用说明

### 第一次使用

1. **创建账号**
   - 点击"创建账号"标签
   - 填写用户名和个人简介
   - 点击"创建账号"按钮
   - 系统会生成密钥对并显示公钥信息

2. **导入账号**
   - 点击"导入账号"标签
   - 输入你的 nsec 私钥
   - 点击"导入账号"按钮

### 主要功能

1. **发布文章**
   - 切换到"发布文章"标签
   - 填写文章标题和内容
   - 点击"发布文章"按钮

2. **浏览时间线**
   - 在"时间线"标签查看文章
   - 点击"刷新时间线"获取最新内容

3. **社交互动**
   - 点赞：点击文章下方的"👍 点赞"按钮
   - 收藏：点击"📚 收藏"按钮
   - 关注：点击"👥 关注"按钮
   - 评论：点击"💬 评论"按钮

4. **中继管理**
   - 切换到"中继管理"标签
   - 添加新的中继地址
   - 查看中继连接状态

## 技术架构

### 前端技术
- 纯 JavaScript (ES6+)
- Webpack 模块打包
- WebSocket 连接
- 本地存储 (localStorage)
- 响应式 CSS

### 真实加密实现
- **nostr-tools 库**：使用官方推荐的 JavaScript 库
- **secp256k1 加密**：真实的椭圆曲线加密
- **事件签名**：使用 ECDSA 进行事件签名
- **事件验证**：完整的事件和签名验证
- **标准编码**：支持 Bech32 编码 (npub/nsec)

### Nostr 协议实现
- **NIP-01**: 基础协议和事件结构
- **NIP-02**: 关注列表管理
- **NIP-19**: Bech32 编码
- **NIP-22**: 评论系统
- **NIP-23**: 长文章发布
- **NIP-25**: 反应/点赞
- **NIP-51**: 收藏列表

### 默认中继服务器
- wss://relay.damus.io
- wss://nos.lol
- wss://relay.snort.social
- wss://eden.nostr.land

## 重要特性

### ✅ 真实的加密实现
- 使用真正的 secp256k1 椭圆曲线加密
- 完整的事件签名和验证
- 标准 Nostr 协议兼容

### ✅ 事件验证
- 事件结构验证
- 签名验证
- 时间戳验证
- 公钥验证

### ✅ 错误处理
- 网络错误处理
- 中继连接重试
- 事件发布失败处理
- 详细的错误日志

### ✅ 性能优化
- 连接池管理
- 事件查询优化
- 缓存机制
- 批量操作支持

## 开发说明

### 依赖库
- **nostr-tools**: 官方 Nostr JavaScript 库
- **secp256k1**: 椭圆曲线加密库
- **crypto-browserify**: 浏览器加密 polyfill
- **buffer**: Buffer polyfill
- **stream-browserify**: Stream polyfill

### 扩展建议

1. **增强功能**
   - 添加私信功能 (NIP-04)
   - 实现群组聊天
   - 添加媒体文件支持
   - 支持更多 NIP 协议

2. **UI 优化**
   - 添加主题切换
   - 实现虚拟滚动
   - 添加通知系统
   - 优化移动端体验

3. **性能优化**
   - 实现事件缓存
   - 添加预加载机制
   - 优化网络请求
   - 添加离线支持

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改善这个项目！

## 许可证

MIT License

## 相关链接

- [Nostr 协议](https://github.com/nostr-protocol/nostr)
- [NIP 规范](https://github.com/nostr-protocol/nips)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
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
- ✅ 收藏文章 (NIP-51) - 支持 a 标签格式
- ✅ 关注/取消关注作者 (NIP-02) - 维护完整关注列表
- ✅ 评论文章 (NIP-22) - 支持回复和多级评论
- ✅ 我的收藏列表 - 查看所有收藏的文章
- ✅ 我关注的人 - 查看关注用户的详细资料


## 相关链接

- [Nostr 协议](https://github.com/nostr-protocol/nostr)
- [NIP 规范](https://github.com/nostr-protocol/nips)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)

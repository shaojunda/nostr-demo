# Nostr 系统学习指南

## 目标功能
1. 对一篇文章的评论（文章放在 IPFS 上）
2. 如何对一篇文章点赞
3. 如何关注一个作者
4. 如何收藏一篇文章

---

## 第一部分：Nostr 基础概念

### 1. 核心概念

Nostr 是一个简单的去中心化社交网络协议，基于以下要素：

```
用户 = 公私钥对 (secp256k1)
数据 = 事件 (JSON格式)
网络 = 中继服务器
```

### 2. 事件结构

所有 Nostr 数据都是事件（Events）：

```json
{
  "id": "事件ID (32字节十六进制)",
  "pubkey": "作者公钥 (32字节十六进制)",
  "created_at": "Unix时间戳",
  "kind": "事件类型 (整数)",
  "tags": [["标签名", "值1", "值2"]],
  "content": "事件内容 (字符串)",
  "sig": "签名 (64字节十六进制)"
}
```

### 3. 关键事件类型

```javascript
const EVENT_KINDS = {
  METADATA: 0,         // 用户元数据
  TEXT_NOTE: 1,        // 文本笔记
  CONTACT_LIST: 3,     // 关注列表
  REACTION: 7,         // 反应/点赞
  COMMENT: 1111,       // NIP-22 评论
  LONG_FORM: 30023,    // 长文章
  BOOKMARK: 10003,     // 收藏
  BOOKMARK_SET: 30003  // 收藏集合
};
```

### 4. 工作流程

```
1. 用户生成密钥对（私钥 + 公钥）
2. 发布用户元数据（kind 0）建立身份
3. 创建各种事件并签名
4. 发布到中继服务器
5. 其他用户从中继读取事件
6. 客户端解析并显示
```

### 5. 用户身份示例

```javascript
// 完整的用户创建和使用流程
async function demonstrateUserWorkflow() {
  // 步骤1：创建新用户
  const userResult = await registerUser({
    name: "测试用户",
    about: "这是一个测试用户",
    picture: "https://example.com/avatar.jpg",
    nip05: "test@example.com"
  });
  
  if (!userResult.success) {
    console.error('用户创建失败:', userResult.error);
    return;
  }
  
  console.log('用户创建成功:', userResult.identity.npub);
  
  // 步骤2：验证用户身份
  const isValid = validateUserIdentity(userResult.identity);
  console.log('用户身份验证:', isValid ? '通过' : '失败');
  
  // 步骤3：获取用户信息
  const profile = await getUserMetadata(userResult.identity.publicKey);
  console.log('用户信息:', profile);
  
  // 步骤4：更新用户信息
  await updateUserProfile({
    about: "更新后的个人简介",
    website: "https://newsite.com"
  });
  
  console.log('用户信息更新完成');
  
  return userResult.identity;
}
```

---

## 第二部分：基础设施搭建

### 1. 安装依赖

```bash
npm install nostr-tools
npm install secp256k1
```

### 2. 用户创建和身份管理

在使用 Nostr 之前，用户需要创建身份和管理个人信息。

```javascript
import { 
  SimplePool, 
  getEventHash, 
  getSignature,
  generatePrivateKey,
  getPublicKey,
  nip19
} from 'nostr-tools';

// 创建新用户
function createNewUser() {
  // 生成私钥
  const privateKey = generatePrivateKey();
  
  // 从私钥派生公钥
  const publicKey = getPublicKey(privateKey);
  
  // 生成用户友好的格式（npub 和 nsec）
  const npub = nip19.npubEncode(publicKey);   // 公钥的 bech32 格式
  const nsec = nip19.nsecEncode(privateKey);  // 私钥的 bech32 格式
  
  return {
    privateKey,
    publicKey,
    npub,
    nsec
  };
}

// 发布用户元数据（kind 0）
async function publishUserMetadata(userInfo) {
  const { name, about, picture, nip05, website, banner } = userInfo;
  
  const metadata = {
    name: name || '',
    about: about || '',
    picture: picture || '',
    nip05: nip05 || '',
    website: website || '',
    banner: banner || ''
  };
  
  const metadataEvent = {
    kind: 0,  // 用户元数据
    content: JSON.stringify(metadata),
    tags: [],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };
  
  await publishEvent(metadataEvent);
  return metadataEvent;
}

// 获取用户元数据
async function getUserMetadata(pubkey) {
  const events = await queryEvents({
    kinds: [0],
    authors: [pubkey],
    limit: 1
  });
  
  if (events.length === 0) {
    return null;
  }
  
  try {
    const metadata = JSON.parse(events[0].content);
    return {
      ...metadata,
      pubkey,
      lastUpdated: events[0].created_at
    };
  } catch (error) {
    console.error('解析用户元数据失败:', error);
    return null;
  }
}

// 更新用户信息
async function updateUserProfile(updates) {
  // 获取当前用户信息
  const currentMetadata = await getUserMetadata(userPublicKey);
  
  // 合并更新
  const newMetadata = {
    ...currentMetadata,
    ...updates
  };
  
  // 发布更新后的元数据
  return await publishUserMetadata(newMetadata);
}

// 用户注册完整流程
async function registerUser(profileInfo) {
  try {
    // 1. 创建密钥对
    const identity = createNewUser();
    
    console.log('用户身份创建成功:');
    console.log('公钥 (npub):', identity.npub);
    console.log('私钥 (nsec):', identity.nsec);
    console.log('⚠️  请妥善保存私钥，丢失后无法恢复！');
    
    // 2. 设置全局用户信息
    userPrivateKey = identity.privateKey;
    userPublicKey = identity.publicKey;
    
    // 3. 发布用户元数据
    const metadataEvent = await publishUserMetadata(profileInfo);
    
    console.log('用户信息发布成功');
    
    return {
      identity,
      metadataEvent,
      success: true
    };
    
  } catch (error) {
    console.error('用户注册失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 从 nsec 导入用户
function importUserFromNsec(nsec) {
  try {
    const { type, data } = nip19.decode(nsec);
    
    if (type !== 'nsec') {
      throw new Error('无效的 nsec 格式');
    }
    
    const privateKey = data;
    const publicKey = getPublicKey(privateKey);
    const npub = nip19.npubEncode(publicKey);
    
    return {
      privateKey,
      publicKey,
      npub,
      nsec
    };
    
  } catch (error) {
    console.error('导入用户失败:', error);
    throw error;
  }
}

// 验证用户身份
function validateUserIdentity(identity) {
  try {
    // 验证私钥格式
    if (!identity.privateKey || identity.privateKey.length !== 64) {
      return false;
    }
    
    // 验证公钥是否从私钥正确派生
    const derivedPublicKey = getPublicKey(identity.privateKey);
    
    return derivedPublicKey === identity.publicKey;
    
  } catch (error) {
    return false;
  }
}

// 用户信息缓存管理
class UserProfileCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存
  }
  
  get(pubkey) {
    const cached = this.cache.get(pubkey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.profile;
    }
    return null;
  }
  
  set(pubkey, profile) {
    this.cache.set(pubkey, {
      profile,
      timestamp: Date.now()
    });
  }
  
  async getProfile(pubkey) {
    // 先检查缓存
    const cached = this.get(pubkey);
    if (cached) {
      return cached;
    }
    
    // 从网络获取
    const profile = await getUserMetadata(pubkey);
    if (profile) {
      this.set(pubkey, profile);
    }
    
    return profile;
  }
}

// 全局用户信息缓存
const userProfileCache = new UserProfileCache();

// 批量获取用户信息
async function batchGetUserProfiles(pubkeys) {
  const profiles = new Map();
  const missingPubkeys = [];
  
  // 检查缓存
  for (const pubkey of pubkeys) {
    const cached = userProfileCache.get(pubkey);
    if (cached) {
      profiles.set(pubkey, cached);
    } else {
      missingPubkeys.push(pubkey);
    }
  }
  
  // 批量获取缺失的用户信息
  if (missingPubkeys.length > 0) {
    const events = await queryEvents({
      kinds: [0],
      authors: missingPubkeys,
      limit: missingPubkeys.length
    });
    
    for (const event of events) {
      try {
        const metadata = JSON.parse(event.content);
        const profile = {
          ...metadata,
          pubkey: event.pubkey,
          lastUpdated: event.created_at
        };
        
        profiles.set(event.pubkey, profile);
        userProfileCache.set(event.pubkey, profile);
      } catch (error) {
        console.error('解析用户元数据失败:', error);
      }
    }
  }
  
  return profiles;
}

// 使用示例和最佳实践
/*
使用示例：

1. 创建新用户：
const newUser = await registerUser({
  name: "Alice",
  about: "Nostr 爱好者",
  picture: "https://example.com/avatar.jpg",
  nip05: "alice@example.com",
  website: "https://alice.blog"
});

2. 导入现有用户：
const nsec = "nsec1...";
const identity = importUserFromNsec(nsec);
userPrivateKey = identity.privateKey;
userPublicKey = identity.publicKey;

3. 更新用户信息：
await updateUserProfile({
  about: "更新的个人简介",
  picture: "https://example.com/new-avatar.jpg"
});

4. 批量获取用户信息（用于评论列表等）：
const pubkeys = ["pubkey1", "pubkey2", "pubkey3"];
const profiles = await batchGetUserProfiles(pubkeys);

最佳实践：
- 私钥必须安全存储，建议使用加密存储
- 公钥可以公开分享，使用 npub 格式更用户友好
- 用户信息缓存可以显著提升性能
- 定期更新用户信息以保持最新状态
- 验证用户身份以防止恶意行为
*/
```

### 3. 基础代码框架

```javascript
import { SimplePool, getEventHash, getSignature } from 'nostr-tools';

// 中继服务器列表
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social'
];

// 初始化连接池
const pool = new SimplePool();

// 用户密钥对（实际应用中需要安全存储）
const userPrivateKey = '你的私钥';
const userPublicKey = '你的公钥';

// 签名事件
function signEvent(event) {
  event.id = getEventHash(event);
  event.sig = getSignature(event, userPrivateKey);
  return event;
}

// 发布事件
async function publishEvent(event) {
  const signedEvent = signEvent(event);
  const pubs = pool.publish(RELAYS, signedEvent);

  return new Promise((resolve, reject) => {
    let successCount = 0;
    let errorCount = 0;

    pubs.on('ok', () => {
      successCount++;
      if (successCount > 0) resolve();
    });

    pubs.on('failed', (reason) => {
      errorCount++;
      if (errorCount === RELAYS.length) reject(reason);
    });
  });
}

// 查询事件
async function queryEvents(filter) {
  return new Promise((resolve) => {
    const events = [];
    const sub = pool.sub(RELAYS, [filter]);

    sub.on('event', (event) => {
      events.push(event);
    });

    sub.on('eose', () => {
      sub.unsub();
      resolve(events);
    });
  });
}
```

---

## 第三部分：功能实现

### 1. 文章评论系统（IPFS + Nostr）

#### 1.1 文章发布到 IPFS

```javascript
// 发布文章到 IPFS
async function publishArticleToIPFS(title, content) {
  const article = {
    title,
    content,
    timestamp: Date.now(),
    author: userPublicKey
  };

  // 这里需要集成 IPFS 客户端
  // const ipfsHash = await ipfs.add(JSON.stringify(article));
  const ipfsHash = "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // 示例

  return ipfsHash;
}

// 在 Nostr 中发布文章引用
async function publishArticleReference(ipfsHash, title, summary) {
  const articleEvent = {
    kind: 30023,  // NIP-23 长文章
    content: summary,
    tags: [
      ["d", ipfsHash],                    // 文章标识符
      ["title", title],
      ["summary", summary],
      ["r", `ipfs://${ipfsHash}`],        // IPFS 链接
      ["content-type", "text/markdown"]
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(articleEvent);
  return articleEvent;
}
```

#### 1.2 文章评论功能 NIP-22

**重要说明**: 根据 NIP-22 规定，对 kind 30023 文章的评论必须使用 kind 1111，并使用 "A" 标签引用文章，同时添加 "K" 标签指明根事件类型。

```javascript
// 对文章发表评论 - 使用 NIP-22 规范
async function commentOnArticle(articleATag, commentText, parentCommentId = null) {
  // 解析 A 标签获取文章作者信息
  const [kind, authorPubkey, dTag] = articleATag.split(':');
  
  const commentEvent = {
    kind: 1111,  // NIP-22 评论事件
    content: commentText,
    tags: [
      ["A", articleATag],                 // 使用 A 标签引用文章
      ["K", "30023"],                    // 指明根事件的 kind
      ["P", authorPubkey]                 // 提及文章作者
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  // 如果是回复评论（回复仍使用 e 标签）
  if (parentCommentId) {
    commentEvent.tags.push(["e", parentCommentId, "", "reply"]);
  }

  await publishEvent(commentEvent);
  return commentEvent;
}

// 获取文章的所有评论 - 使用 A 标签过滤
async function getArticleComments(articleATag, flatTree = true) {
  const comments = await queryEvents({
    kinds: [1111],
    '#A': [articleATag],  // 使用 A 标签过滤评论
    limit: 1000
  });

  // 根据需要选择评论树结构
  return flatTree ? buildFlatCommentTree(comments) : buildCommentTree(comments);
}

// 构建评论树（无限嵌套版本）
function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  // 创建评论映射
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      children: [],
      isReply: false
    });
  });

  // 构建树状结构
  comments.forEach(comment => {
    const replyTag = comment.tags.find(tag =>
      tag[0] === 'e' && tag[3] === 'reply'
    );

    if (replyTag) {
      const parent = commentMap.get(replyTag[1]);
      if (parent) {
        parent.children.push(commentMap.get(comment.id));
        commentMap.get(comment.id).isReply = true;
      }
    } else {
      // 检查是否是对文章的直接评论（包含 A 标签但不包含回复 e 标签）
      const hasArticleTag = comment.tags.some(tag => tag[0] === 'A');
      if (hasArticleTag) {
        rootComments.push(commentMap.get(comment.id));
      }
    }
  });

  return rootComments;
}

// 构建两层评论树（UI 友好版本）
function buildFlatCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];
  const allReplies = [];

  // 创建评论映射
  comments.forEach(comment => {
    const commentData = {
      ...comment,
      children: [],
      isReply: false,
      replyToAuthor: null,
      replyToContent: null
    };
    commentMap.set(comment.id, commentData);
  });

  // 分类评论：根评论 vs 回复评论
  comments.forEach(comment => {
    const replyTag = comment.tags.find(tag =>
      tag[0] === 'e' && tag[3] === 'reply'
    );

    if (replyTag) {
      // 这是一个回复评论
      const parentComment = commentMap.get(replyTag[1]);
      const currentComment = commentMap.get(comment.id);
      
      currentComment.isReply = true;
      
      if (parentComment) {
        // 设置回复目标信息（用于显示"回复 @某人"）
        currentComment.replyToAuthor = parentComment.pubkey;
        currentComment.replyToContent = parentComment.content.substring(0, 50) + '...';
        currentComment.replyToId = parentComment.id;
      }
      
      allReplies.push(currentComment);
    } else {
      // 检查是否是对文章的直接评论
      const hasArticleTag = comment.tags.some(tag => tag[0] === 'A');
      if (hasArticleTag) {
        rootComments.push(commentMap.get(comment.id));
      }
    }
  });

  // 将所有回复按时间排序后添加到对应的根评论下
  allReplies.sort((a, b) => a.created_at - b.created_at);

  // 找到每个回复应该归属的根评论
  allReplies.forEach(reply => {
    // 查找这个回复的根评论（可能需要递归查找）
    const rootComment = findRootComment(reply, commentMap, comments);
    if (rootComment) {
      rootComment.children.push(reply);
    }
  });

  return rootComments;
}

// 查找回复评论的根评论
function findRootComment(reply, commentMap, allComments) {
  const replyTag = reply.tags.find(tag =>
    tag[0] === 'e' && tag[3] === 'reply'
  );
  
  if (!replyTag) return null;
  
  const parentId = replyTag[1];
  const parent = commentMap.get(parentId);
  
  if (!parent) return null;
  
  // 如果父评论不是回复（即是根评论），则返回它
  if (!parent.isReply) {
    return parent;
  }
  
  // 如果父评论也是回复，继续向上查找
  return findRootComment(parent, commentMap, allComments);
}

// 使用示例：两种 UI 展示方式

// 1. 无限嵌套展示（传统论坛风格）
async function showNestedComments(articleATag) {
  const comments = await getArticleComments(articleATag, false);
  renderNestedComments(comments);
}

// 2. 两层展平展示（现代社交媒体风格）
async function showFlatComments(articleATag) {
  const comments = await getArticleComments(articleATag, true);
  renderFlatComments(comments);
}

// 渲染两层展平评论的示例
function renderFlatComments(rootComments) {
  rootComments.forEach(rootComment => {
    console.log(`💬 ${getUserName(rootComment.pubkey)}: ${rootComment.content}`);
    
    // 显示所有回复（第二层）
    rootComment.children.forEach(reply => {
      const replyTarget = reply.replyToAuthor ? 
        `回复 @${getUserName(reply.replyToAuthor)}` : '';
      console.log(`  ↳ ${getUserName(reply.pubkey)} ${replyTarget}: ${reply.content}`);
    });
    
    console.log('---');
  });
}

// 你的示例效果：
// 💬 Alice: 这篇文章很不错！              <- 第一层（根评论）
//   ↳ Bob 回复 @Alice: 我也这么认为        <- 第二层（回复评论）  
//   ↳ Cril 回复 @Bob: 确实很有见地         <- 第二层（回复的回复，但展平显示）
//   ↳ Dave 回复 @Alice: 有不同看法        <- 第二层（另一个回复）
// 💬 Eve: 作者观点很独特                  <- 第一层（另一个根评论）
//   ↳ Frank 回复 @Eve: 能具体说说吗？      <- 第二层
```

### 2. 文章点赞功能（NIP-25）

```javascript
// 对文章点赞（符合 NIP-10 和 NIP-25）
async function likeArticle(articleEventId, authorPubkey, relayUrl = "") {
  const reactionEvent = {
    kind: 7,  // NIP-25 Reaction 事件
    content: "+",  // 点赞符号
    tags: [
      // NIP-10 标准的 e 标签格式
      ["e", articleEventId, relayUrl, "", authorPubkey],
      ["p", authorPubkey]  // 通知原作者
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(reactionEvent);
  return reactionEvent;
}

// 对评论点赞（符合 NIP-10，可能涉及多个用户通知）
async function likeComment(commentEventId, commentAuthor, originalAuthor = null, relayUrl = "") {
  const tags = [
    // NIP-10 标准格式：包含作者公钥便于客户端处理
    ["e", commentEventId, relayUrl, "", commentAuthor],
    ["p", commentAuthor]  // 通知评论作者
  ];
  
  // 如果评论的原文章作者不同，也通知原作者
  if (originalAuthor && originalAuthor !== commentAuthor) {
    tags.push(["p", originalAuthor]);
  }
  
  const reactionEvent = {
    kind: 7,
    content: "+",
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(reactionEvent);
  return reactionEvent;
}

// NIP-10 在不同事件类型中的应用
/*
NIP-10 是通用的事件引用标准，适用于：

1. kind 1 (文本笔记) - 回复其他笔记
   ["e", "parent_id", "relay", "reply", "parent_author"]

2. kind 7 (反应/点赞) - 对其他事件的反应
   ["e", "target_id", "relay", "", "target_author"]

3. kind 1111 (评论) - 评论其他内容
   ["e", "target_id", "relay", "root", "target_author"]

4. kind 6 (转发) - 转发其他事件
   ["e", "repost_id", "relay", "", "original_author"]

为什么点赞需要遵循 NIP-10？
- 标准化：所有客户端都能正确解析引用关系
- 上下文：提供被点赞事件的完整信息
- 性能：客户端可以预取相关事件
- 兼容性：确保不同客户端的互操作性
*/

// 多个 p 标签的使用场景说明
/*
为什么点赞事件会有多个 p 标签？

1. 通知机制：每个 p 标签都会触发对应用户的通知
2. 上下文完整性：确保所有相关参与者都能收到反馈
3. 社交网络效应：增加内容的可见性和互动性

常见的多 p 标签场景：
- 点赞评论：通知评论作者 + 原文章作者
- 点赞回复：通知回复作者 + 被回复者 + 原文章作者
- 点赞转发：通知转发者 + 原作者

示例：Alice 发文章 → Bob 评论 → Charlie 点赞 Bob 的评论
Charlie 的点赞事件会包含：
- ["p", "alice_pubkey"]  // 通知原文章作者
- ["p", "bob_pubkey"]    // 通知被点赞评论作者
- ["e", "bob_comment_id"] // 引用被点赞的评论
*/

// 智能点赞函数（自动处理多用户通知）
async function smartLike(targetEventId, contextInfo) {
  const { type, targetAuthor, originalAuthor, mentionedUsers = [] } = contextInfo;
  
  const tags = [
    ["e", targetEventId],
    ["p", targetAuthor]  // 被点赞内容的作者
  ];
  
  // 根据上下文添加更多通知
  if (type === 'comment' && originalAuthor && originalAuthor !== targetAuthor) {
    tags.push(["p", originalAuthor]);  // 原文章作者
  }
  
  // 添加其他相关用户（去重）
  const existingPubkeys = new Set(tags.filter(tag => tag[0] === 'p').map(tag => tag[1]));
  mentionedUsers.forEach(pubkey => {
    if (!existingPubkeys.has(pubkey)) {
      tags.push(["p", pubkey]);
    }
  });
  
  const reactionEvent = {
    kind: 7,
    content: "+",
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(reactionEvent);
  return reactionEvent;
}

// 取消点赞
async function unlikeArticle(articleEventId, authorPubkey) {
  const reactionEvent = {
    kind: 7,
    content: "",  // 空内容表示取消
    tags: [
      ["e", articleEventId],
      ["p", authorPubkey]
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(reactionEvent);
  return reactionEvent;
}

// 获取文章的点赞统计
async function getArticleLikes(articleEventId) {
  const reactions = await queryEvents({
    kinds: [7],
    '#e': [articleEventId],
    limit: 1000
  });

  return analyzeReactions(reactions);
}

// 分析反应数据
function analyzeReactions(reactions) {
  const userReactions = new Map();

  // 去重，同一用户最新的反应为准
  reactions.forEach(reaction => {
    const userId = reaction.pubkey;
    if (!userReactions.has(userId) ||
        reaction.created_at > userReactions.get(userId).created_at) {
      userReactions.set(userId, reaction);
    }
  });

  // 统计结果
  const counts = {};
  userReactions.forEach(reaction => {
    if (reaction.content) {  // 非空内容
      counts[reaction.content] = (counts[reaction.content] || 0) + 1;
    }
  });

  return {
    totalLikes: counts["+"] || 0,
    totalDislikes: counts["-"] || 0,
    reactions: counts,
    userReactions: Array.from(userReactions.values())
  };
}

// 检查用户是否已点赞
async function hasUserLiked(articleEventId, userPubkey) {
  const reactions = await queryEvents({
    kinds: [7],
    authors: [userPubkey],
    '#e': [articleEventId],
    limit: 1
  });

  if (reactions.length === 0) return false;

  const latest = reactions.sort((a, b) => b.created_at - a.created_at)[0];
  return latest.content === "+";
}
```

### 3. 关注作者功能（NIP-02）

**重要概念**：Nostr 中的关注不是每个关注一条事件，而是用一个 kind 3 事件存储**完整的关注列表**。

#### 关注机制详解

```
传统社交网络：Alice 关注 Bob → 产生一条 "follow" 记录
Nostr 机制：Alice 关注 Bob → 发布新的完整关注列表（包含所有关注的人）
```

#### 数据结构对比

```javascript
// ❌ 错误理解：每个关注一条事件
{
  "kind": "follow",  // 这种事件类型不存在
  "content": "",
  "tags": [["p", "bob_pubkey"]],
  "pubkey": "alice_pubkey"
}

// ✅ 正确实现：完整关注列表
{
  "kind": 3,  // Contact List
  "content": "",
  "tags": [
    ["p", "alice_pubkey", "wss://relay1.com", "Alice"],
    ["p", "bob_pubkey", "wss://relay2.com", "Bob"],
    ["p", "charlie_pubkey", "", "Charlie"]
  ],
  "pubkey": "my_pubkey"
}
```

```javascript
// 关注作者
async function followAuthor(authorPubkey, alias = "") {
  // 获取当前关注列表
  const currentFollows = await getCurrentFollowList();

  // 检查是否已关注
  const isAlreadyFollowing = currentFollows.some(tag =>
    tag[0] === 'p' && tag[1] === authorPubkey
  );

  if (isAlreadyFollowing) {
    console.log("已经关注过该作者");
    return;
  }

  // 添加新关注
  const newFollowList = [
    ...currentFollows,
    ["p", authorPubkey, "", alias]
  ];

  const followEvent = {
    kind: 3,  // Contact List
    content: "",
    tags: newFollowList,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(followEvent);
  return followEvent;
}

// 取消关注
async function unfollowAuthor(authorPubkey) {
  const currentFollows = await getCurrentFollowList();

  const updatedFollows = currentFollows.filter(tag =>
    !(tag[0] === 'p' && tag[1] === authorPubkey)
  );

  const unfollowEvent = {
    kind: 3,
    content: "",
    tags: updatedFollows,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(unfollowEvent);
  return unfollowEvent;
}

// 获取当前关注列表
async function getCurrentFollowList() {
  const followEvents = await queryEvents({
    kinds: [3],
    authors: [userPublicKey],
    limit: 1
  });

  if (followEvents.length === 0) return [];

  return followEvents[0].tags.filter(tag => tag[0] === 'p');
}

// 获取关注的作者列表
async function getFollowedAuthors() {
  const followList = await getCurrentFollowList();

  return followList.map(tag => ({
    pubkey: tag[1],
    relayUrl: tag[2] || "",
    alias: tag[3] || ""
  }));
}

// 检查是否关注某个作者
async function isFollowingAuthor(authorPubkey) {
  const followList = await getCurrentFollowList();
  return followList.some(tag => tag[1] === authorPubkey);
}

// 获取关注者统计
async function getFollowStats(authorPubkey) {
  const [following, followers] = await Promise.all([
    getUserFollowList(authorPubkey),
    getFollowers(authorPubkey)
  ]);

  return {
    followingCount: following.length,
    followersCount: followers.length,
    ratio: followers.length / (following.length || 1)
  };
}

// 获取某用户的关注列表
async function getUserFollowList(userPubkey) {
  const followEvents = await queryEvents({
    kinds: [3],
    authors: [userPubkey],
    limit: 1
  });

  if (followEvents.length === 0) return [];

  return followEvents[0].tags
    .filter(tag => tag[0] === 'p')
    .map(tag => ({
      pubkey: tag[1],
      relayUrl: tag[2] || "",
      alias: tag[3] || ""
    }));
}

// 获取关注者（谁关注了我）
async function getFollowers(targetPubkey) {
  const followers = await queryEvents({
    kinds: [3],
    '#p': [targetPubkey],
    limit: 1000
  });

  return followers.map(event => ({
    follower: event.pubkey,
    followedAt: event.created_at,
    alias: event.tags.find(tag =>
      tag[0] === 'p' && tag[1] === targetPubkey
    )?.[3] || ""
  }));
}

// 关注机制的工作流程详解
/*
1. 初始状态：Alice 没有关注任何人
   - 没有 kind 3 事件，或者 tags 为空数组

2. Alice 关注 Bob：
   - 获取当前关注列表（空）
   - 创建新的关注列表：[["p", "bob_pubkey", "", "Bob"]]
   - 发布新的 kind 3 事件

3. Alice 又关注 Charlie：
   - 获取当前关注列表：[["p", "bob_pubkey", "", "Bob"]]
   - 创建新的关注列表：[["p", "bob_pubkey", "", "Bob"], ["p", "charlie_pubkey", "", "Charlie"]]
   - 发布新的 kind 3 事件（会替换之前的）

4. Alice 取消关注 Bob：
   - 获取当前关注列表：[["p", "bob_pubkey", "", "Bob"], ["p", "charlie_pubkey", "", "Charlie"]]
   - 过滤掉 Bob：[["p", "charlie_pubkey", "", "Charlie"]]
   - 发布新的 kind 3 事件
*/

// 关注状态的查询和缓存
class FollowManager {
  constructor() {
    this.followListCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  // 获取用户的关注列表（带缓存）
  async getFollowList(userPubkey) {
    const cacheKey = userPubkey;
    const cached = this.followListCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.followList;
    }

    const followEvents = await queryEvents({
      kinds: [3],
      authors: [userPubkey],
      limit: 1
    });

    const followList = followEvents.length > 0 ? 
      followEvents[0].tags.filter(tag => tag[0] === 'p') : [];

    // 缓存结果
    this.followListCache.set(cacheKey, {
      followList,
      timestamp: Date.now()
    });

    return followList;
  }

  // 批量检查关注状态
  async checkFollowStatus(checkerPubkey, targetPubkeys) {
    const followList = await this.getFollowList(checkerPubkey);
    const followedPubkeys = new Set(followList.map(tag => tag[1]));
    
    return targetPubkeys.map(pubkey => ({
      pubkey,
      isFollowed: followedPubkeys.has(pubkey)
    }));
  }

  // 清除缓存
  clearCache(userPubkey = null) {
    if (userPubkey) {
      this.followListCache.delete(userPubkey);
    } else {
      this.followListCache.clear();
    }
  }
}

// 全局关注管理器
const followManager = new FollowManager();

// 优化的关注操作
async function optimizedFollowAuthor(authorPubkey, alias = "") {
  try {
    const currentFollows = await followManager.getFollowList(userPublicKey);
    
    // 检查是否已关注
    const isAlreadyFollowing = currentFollows.some(tag => tag[1] === authorPubkey);
    if (isAlreadyFollowing) {
      return { success: false, reason: "already_following" };
    }

    // 创建新的关注列表
    const newFollowList = [
      ...currentFollows,
      ["p", authorPubkey, "", alias]
    ];

    const followEvent = {
      kind: 3,
      content: "",
      tags: newFollowList,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: userPublicKey
    };

    await publishEvent(followEvent);
    
    // 清除缓存
    followManager.clearCache(userPublicKey);
    
    return { success: true, followEvent };
  } catch (error) {
    console.error("关注失败:", error);
    return { success: false, reason: "network_error", error };
  }
}

// NIP-10 e 标签详解
/*
e 标签格式：["e", <event-id>, <relay-url>, <marker>, <pubkey>]

位置说明：
- 位置 0: "e" - 标签类型
- 位置 1: event-id - 被引用事件的 ID（必需）
- 位置 2: relay-url - 推荐的中继 URL（可选，空字符串表示使用默认）
- 位置 3: marker - 标记类型（可选但推荐）
- 位置 4: pubkey - 被引用事件的作者公钥（可选）

Marker 类型：
- "reply" - 直接回复该事件
- "root" - 引用对话的根事件
- "mention" - 提及该事件（不是回复）
- "" - 空字符串，让客户端自动判断

示例分析：
["e", "23f4caa...", "", "", "b83a28b7..."]
- 引用事件 ID: 23f4caa...
- 中继 URL: 空（使用默认）
- 标记: 空（让客户端判断）
- 作者公钥: b83a28b7...
*/

// 不同场景的 e 标签使用示例
const E_TAG_EXAMPLES = {
  // 直接回复
  reply: ["e", "parent_event_id", "wss://relay.com", "reply", "author_pubkey"],
  
  // 引用根事件
  root: ["e", "root_event_id", "", "root", "root_author_pubkey"],
  
  // 提及事件
  mention: ["e", "mentioned_event_id", "", "mention", "mentioned_author_pubkey"],
  
  // 复杂回复（包含根事件和直接回复）
  complex_reply: [
    ["e", "root_event_id", "", "root", "root_author_pubkey"],
    ["e", "parent_event_id", "", "reply", "parent_author_pubkey"]
  ]
};

// 构建正确的 e 标签
function buildETag(eventId, relayUrl = "", marker = "", authorPubkey = "") {
  const tag = ["e", eventId];
  
  // 添加中继 URL
  tag.push(relayUrl);
  
  // 添加标记
  tag.push(marker);
  
  // 添加作者公钥（如果提供）
  if (authorPubkey) {
    tag.push(authorPubkey);
  }
  
  return tag;
}

// 解析 e 标签
function parseETag(eTag) {
  const [type, eventId, relayUrl = "", marker = "", authorPubkey = ""] = eTag;
  
  return {
    type,
    eventId,
    relayUrl: relayUrl || null,
    marker: marker || null,
    authorPubkey: authorPubkey || null,
    isReply: marker === "reply",
    isRoot: marker === "root",
    isMention: marker === "mention"
  };
}

// 在评论中正确使用 e 标签
async function replyToComment(parentCommentId, parentAuthor, rootEventId, rootAuthor, commentText) {
  const commentEvent = {
    kind: 1111,
    content: commentText,
    tags: [
      // 引用根事件
      ["e", rootEventId, "", "root", rootAuthor],
      // 回复父评论
      ["e", parentCommentId, "", "reply", parentAuthor],
      // 提及相关用户
      ["P", parentAuthor],
      ["P", rootAuthor]
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(commentEvent);
  return commentEvent;
}
```

### 4. 收藏文章功能（NIP-51）

```javascript
// 收藏文章
async function bookmarkArticle(articleEventId, title = "") {
  // 获取当前收藏列表
  const currentBookmarks = await getCurrentBookmarks();

  // 检查是否已收藏
  const isAlreadyBookmarked = currentBookmarks.some(tag =>
    tag[0] === 'e' && tag[1] === articleEventId
  );

  if (isAlreadyBookmarked) {
    console.log("已经收藏过该文章");
    return;
  }

  // 添加新收藏
  const newBookmarks = [
    ...currentBookmarks,
    ["e", articleEventId, ""]
  ];

  const bookmarkEvent = {
    kind: 10003,  // Bookmark list
    content: "",
    tags: [
      ["title", title || "我的收藏"],
      ["description", "收藏的文章"],
      ...newBookmarks
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(bookmarkEvent);
  return bookmarkEvent;
}

// 取消收藏
async function unbookmarkArticle(articleEventId) {
  const currentBookmarks = await getCurrentBookmarks();

  const updatedBookmarks = currentBookmarks.filter(tag =>
    !(tag[0] === 'e' && tag[1] === articleEventId)
  );

  const unbookmarkEvent = {
    kind: 10003,
    content: "",
    tags: [
      ["title", "我的收藏"],
      ["description", "收藏的文章"],
      ...updatedBookmarks
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(unbookmarkEvent);
  return unbookmarkEvent;
}

// 获取当前收藏列表
async function getCurrentBookmarks() {
  const bookmarkEvents = await queryEvents({
    kinds: [10003, 30003],
    authors: [userPublicKey],
    limit: 1
  });

  if (bookmarkEvents.length === 0) return [];

  const latest = bookmarkEvents.sort((a, b) => b.created_at - a.created_at)[0];
  return latest.tags.filter(tag => tag[0] === 'e');
}

// 获取收藏的文章列表
async function getBookmarkedArticles() {
  const bookmarks = await getCurrentBookmarks();

  if (bookmarks.length === 0) return [];

  const articleIds = bookmarks.map(tag => tag[1]);

  const articles = await queryEvents({
    kinds: [30023],
    ids: articleIds,
    limit: 100
  });

  return articles;
}

// 检查是否已收藏某篇文章
async function isArticleBookmarked(articleEventId) {
  const bookmarks = await getCurrentBookmarks();
  return bookmarks.some(tag => tag[1] === articleEventId);
}

// NIP-51 集合事件类型详解
/*
Kind 30003 - 收藏集合 (Bookmark Sets)
- 用途: 用户定义的收藏分类，个人收藏管理
- 支持内容: Kind 1 笔记、Kind 30023 文章、标签、URLs
- 场景: 按主题分类收藏，如"技术文章"、"生活感悟"

Kind 30004 - 策展集合 (文章/笔记)
- 用途: 用户精选的文章组合，内容策展
- 支持内容: Kind 30023 文章、Kind 1 笔记
- 场景: 推荐阅读列表，如"本周精选"、"新手必读"

Kind 30005 - 策展集合 (视频)
- 用途: 用户精选的视频组合
- 支持内容: Kind 21 视频
- 场景: 视频推荐列表，如"教程合集"、"精彩瞬间"

区别总结:
- 30003: 个人收藏 (私人使用)
- 30004: 内容策展 (公开推荐)
- 30005: 视频策展 (专门针对视频)
*/

// 创建收藏集合 (Kind 30003)
async function createBookmarkSet(category, title, items) {
  const bookmarkSet = {
    kind: 30003,  // Bookmark sets
    content: "",
    tags: [
      ["d", category],
      ["title", title],
      ["description", `${title}相关收藏`],
      ...items.map(item => {
        if (item.type === 'event') {
          return ["e", item.id];
        } else if (item.type === 'article') {
          return ["a", item.reference];
        } else if (item.type === 'url') {
          return ["r", item.url];
        } else if (item.type === 'hashtag') {
          return ["t", item.tag];
        }
      }).filter(Boolean)
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(bookmarkSet);
  return bookmarkSet;
}

// 创建文章策展集合 (Kind 30004)
async function createArticleCurationSet(category, title, description, articles) {
  const curationSet = {
    kind: 30004,  // Curation sets (articles/notes)
    content: description,
    tags: [
      ["d", category],
      ["title", title],
      ["description", description],
      ...articles.map(article => {
        if (article.kind === 30023) {
          return ["a", `30023:${article.pubkey}:${article.dTag}`];
        } else if (article.kind === 1) {
          return ["e", article.id];
        }
      }).filter(Boolean)
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(curationSet);
  return curationSet;
}

// 创建视频策展集合 (Kind 30005)
async function createVideoCurationSet(category, title, description, videos) {
  const videoCurationSet = {
    kind: 30005,  // Curation sets (videos)
    content: description,
    tags: [
      ["d", category],
      ["title", title],
      ["description", description],
      ...videos.map(video => ["e", video.id])  // Kind 21 videos
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: userPublicKey
  };

  await publishEvent(videoCurationSet);
  return videoCurationSet;
}

// 获取收藏集合
async function getBookmarkSet(category) {
  const bookmarkSets = await queryEvents({
    kinds: [30003],
    authors: [userPublicKey],
    '#d': [category],
    limit: 1
  });

  return bookmarkSets[0] || null;
}

// 使用示例对比
async function demonstrateNip51Differences() {
  // 1. 收藏集合 (Kind 30003) - 个人收藏管理
  const myBookmarks = await createBookmarkSet("tech", "技术收藏", [
    { type: 'article', reference: '30023:author1:article1' },
    { type: 'event', id: 'note_id_123' },
    { type: 'url', url: 'https://example.com/tutorial' },
    { type: 'hashtag', tag: 'blockchain' }
  ]);

  // 2. 文章策展集合 (Kind 30004) - 内容推荐
  const weeklyPicks = await createArticleCurationSet(
    "weekly_picks",
    "本周精选文章",
    "这周最值得阅读的技术文章",
    [
      { kind: 30023, pubkey: 'author1', dTag: 'article1' },
      { kind: 1, id: 'note_id_456' },
      { kind: 30023, pubkey: 'author2', dTag: 'article2' }
    ]
  );

  // 3. 视频策展集合 (Kind 30005) - 视频推荐
  const tutorialVideos = await createVideoCurationSet(
    "blockchain_tutorials",
    "区块链教程合集",
    "适合初学者的区块链视频教程",
    [
      { id: 'video_id_789' },
      { id: 'video_id_101' }
    ]
  );

  return { myBookmarks, weeklyPicks, tutorialVideos };
}

// 查询不同类型的集合
async function queryAllUserSets(userPubkey) {
  const [bookmarkSets, articleSets, videoSets] = await Promise.all([
    // 收藏集合
    queryEvents({
      kinds: [30003],
      authors: [userPubkey],
      limit: 50
    }),
    // 文章策展集合
    queryEvents({
      kinds: [30004],
      authors: [userPubkey],
      limit: 50
    }),
    // 视频策展集合
    queryEvents({
      kinds: [30005],
      authors: [userPubkey],
      limit: 50
    })
  ]);

  return {
    bookmarks: bookmarkSets.map(parseSet),
    articles: articleSets.map(parseSet),
    videos: videoSets.map(parseSet)
  };
}

// 解析集合事件
function parseSet(setEvent) {
  const title = setEvent.tags.find(tag => tag[0] === 'title')?.[1] || '';
  const description = setEvent.tags.find(tag => tag[0] === 'description')?.[1] || '';
  const dTag = setEvent.tags.find(tag => tag[0] === 'd')?.[1] || '';

  const items = setEvent.tags
    .filter(tag => ['e', 'a', 'r', 't'].includes(tag[0]))
    .map(tag => {
      switch (tag[0]) {
        case 'e':
          return { type: 'event', id: tag[1] };
        case 'a':
          return { type: 'article', reference: tag[1] };
        case 'r':
          return { type: 'url', url: tag[1] };
        case 't':
          return { type: 'hashtag', tag: tag[1] };
        default:
          return null;
      }
    })
    .filter(Boolean);

  return {
    kind: setEvent.kind,
    category: dTag,
    title,
    description,
    items,
    author: setEvent.pubkey,
    createdAt: setEvent.created_at
  };
}

// 实际案例解析
/*
真实的 Kind 30003 收藏集合事件：
{
  "kind": 30003,
  "content": "",
  "tags": [
    ["d", "ttl"],
    ["title", "ttl"],
    ["a", "30023:1bc70a0...:zapwall-1748666077355", "wss://relay.damus.io"]
  ]
}

解析结果：
- 集合标识: "ttl"
- 集合标题: "ttl"
- 收藏内容: 一篇长文章 (Kind 30023)
- 文章作者: 1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411
- 文章 ID: zapwall-1748666077355
- 推荐中继: wss://relay.damus.io
*/

// 解析 a 标签引用
function parseATag(aTag) {
  const [kindStr, pubkey, dTag] = aTag.split(':');
  return {
    kind: parseInt(kindStr),
    pubkey,
    dTag,
    reference: aTag
  };
}

// 从收藏集合中提取文章信息
function extractArticlesFromBookmarkSet(bookmarkEvent) {
  const articles = [];
  
  bookmarkEvent.tags.forEach(tag => {
    if (tag[0] === 'a' && tag[1].startsWith('30023:')) {
      const parsed = parseATag(tag[1]);
      const relayHint = tag[2] || '';
      
      articles.push({
        kind: parsed.kind,
        author: parsed.pubkey,
        dTag: parsed.dTag,
        reference: parsed.reference,
        relayHint
      });
    }
  });
  
  return articles;
}

// 使用示例：处理收藏集合事件
function processBookmarkSetEvent(event) {
  const setInfo = parseSet(event);
  const articles = extractArticlesFromBookmarkSet(event);
  
  console.log(`收藏集合: ${setInfo.title}`);
  console.log(`包含 ${articles.length} 篇文章:`);
  
  articles.forEach((article, index) => {
    console.log(`${index + 1}. 文章 ${article.dTag}`);
    console.log(`   作者: ${article.author.substring(0, 16)}...`);
    console.log(`   中继: ${article.relayHint || '默认'}`);
  });
  
  return { setInfo, articles };
}
```

---

## 第四部分：完整示例

### 综合示例：文章系统

```javascript
class NostrArticleSystem {
  constructor(privateKey, publicKey, relays) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.relays = relays;
    this.pool = new SimplePool();
  }

  // 发布文章
  async publishArticle(title, content, ipfsHash) {
    const articleEvent = {
      kind: 30023,
      content: content,
      tags: [
        ["d", ipfsHash],
        ["title", title],
        ["r", `ipfs://${ipfsHash}`],
        ["content-type", "text/markdown"]
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.publicKey
    };

    await this.publishEvent(articleEvent);
    return articleEvent;
  }

  // 获取文章及其互动数据
  async getArticleWithInteractions(articleEventId) {
    const [article, comments, likes, bookmarks] = await Promise.all([
      this.getArticle(articleEventId),
      this.getArticleComments(articleEventId),
      this.getArticleLikes(articleEventId),
      this.isArticleBookmarked(articleEventId)
    ]);

    return {
      article,
      comments,
      likes,
      isBookmarked: bookmarks,
      interactions: {
        commentCount: comments.length,
        likeCount: likes.totalLikes,
        bookmarkCount: bookmarks ? 1 : 0
      }
    };
  }

  // 用户完整操作
  async performUserActions(articleEventId, authorPubkey) {
    // 1. 关注作者
    await this.followAuthor(authorPubkey, "interesting_author");

    // 2. 点赞文章
    await this.likeArticle(articleEventId, authorPubkey);

    // 3. 收藏文章
    await this.bookmarkArticle(articleEventId, "Great Article");

    // 4. 发表评论 - 使用 NIP-22 规范
    const articleATag = `30023:${authorPubkey}:${articleEventId}`;
    await this.commentOnArticle(articleATag, "这篇文章很有见地！");

    console.log("用户操作完成");
  }

  // 获取用户时间线
  async getUserTimeline() {
    const followedAuthors = await this.getFollowedAuthors();
    const authorPubkeys = followedAuthors.map(author => author.pubkey);

    const timeline = await queryEvents({
      kinds: [1, 30023],
      authors: authorPubkeys,
      limit: 50
    });

    return timeline.sort((a, b) => b.created_at - a.created_at);
  }
}

// 使用示例
const articleSystem = new NostrArticleSystem(
  userPrivateKey,
  userPublicKey,
  RELAYS
);

// 发布文章
const article = await articleSystem.publishArticle(
  "我的第一篇 Nostr 文章",
  "这是一篇关于 Nostr 的文章...",
  "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// 执行用户操作
await articleSystem.performUserActions(article.id, article.pubkey);

// 获取文章详情
const articleDetails = await articleSystem.getArticleWithInteractions(article.id);
console.log(articleDetails);
```

---

## 第五部分：学习资源

### 1. 必读 NIP 文档

- **NIP-01**: 基础协议流程
- **NIP-02**: 联系人列表和昵称
- **NIP-22**: 评论
- **NIP-23**: 长文内容
- **NIP-25**: 反应
- **NIP-51**: 列表

### 2. 推荐工具

- **nostr-tools**: JavaScript 库
- **Damus**: iOS 客户端
- **Amethyst**: Android 客户端
- **Iris**: Web 客户端

### 3. 测试中继

```javascript
const TEST_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine'
];
```

### 4. 调试技巧

```javascript
// 监听事件
function debugEvents(relayUrl) {
  const ws = new WebSocket(relayUrl);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('收到事件:', data);
  };

  // 订阅所有事件
  ws.send(JSON.stringify(['REQ', 'debug', {}]));
}
```

---

## 总结

通过这个系统的学习，你已经掌握了：

1. ✅ **Nostr 基础概念**：事件、中继、签名
2. ✅ **文章评论系统**：IPFS 存储 + Nostr 互动
3. ✅ **点赞功能**：NIP-25 反应机制
4. ✅ **关注功能**：NIP-02 联系人列表
5. ✅ **收藏功能**：NIP-51 列表协议

接下来你可以：
- 构建完整的客户端应用
- 实现更复杂的功能（如私信、群组等）
- 优化性能和用户体验
- 集成更多的去中心化存储方案

祝你学习愉快！🚀

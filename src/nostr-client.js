// 使用真实的 nostr-tools 库
import { 
    SimplePool, 
    finalizeEvent,
    generateSecretKey,
    getPublicKey,
    nip19,
    validateEvent,
    verifyEvent
} from 'nostr-tools';

export class NostrClient {
    constructor() {
        this.relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.snort.social',
            'wss://relay.nostr.band',
            'wss://nostr.wine',
            'wss://relay.nostr.info'
        ];
        
        this.pool = new SimplePool();
        this.privateKey = null;
        this.publicKey = null;
        this.userMetadata = null;
        
        // 事件种类
        this.eventKinds = {
            METADATA: 0,
            TEXT_NOTE: 1,
            CONTACT_LIST: 3,
            REACTION: 7,
            COMMENT: 1111,
            LONG_FORM: 30023,
            BOOKMARK: 10003,
            BOOKMARK_SET: 30003
        };
        
        // 连接状态
        this.connectionStatus = new Map();
        
        console.log('NostrClient initialized with nostr-tools');
    }

    // 创建新账号
    async createAccount(name = '', about = '', picture = '', nip05 = '') {
        try {
            // 生成私钥 (返回 Uint8Array)
            const privateKey = generateSecretKey();
            
            // 从私钥派生公钥 (需要 Uint8Array 或 hex string)
            const publicKey = getPublicKey(privateKey);
            
            // 生成用户友好的格式
            const npub = nip19.npubEncode(publicKey);
            const nsec = nip19.nsecEncode(privateKey);
            
            // 设置用户信息
            await this.setUser(privateKey, publicKey);
            
            // 发布用户元数据
            if (name || about || picture || nip05) {
                await this.publishUserMetadata(name, about, picture, nip05);
            }
            
            console.log('账号创建成功:', { npub, publicKey: publicKey.substring(0, 16) + '...' });
            
            return {
                privateKey,
                publicKey,
                npub,
                nsec,
                name,
                about,
                picture,
                nip05
            };
            
        } catch (error) {
            console.error('创建账号失败:', error);
            throw error;
        }
    }

    // 导入账号
    async importAccount(nsec) {
        try {
            const decoded = nip19.decode(nsec);
            
            if (decoded.type !== 'nsec') {
                throw new Error('无效的 nsec 格式');
            }
            
            const privateKey = decoded.data; // 这已经是 Uint8Array
            const publicKey = getPublicKey(privateKey);
            const npub = nip19.npubEncode(publicKey);
            
            await this.setUser(privateKey, publicKey);
            
            // 获取用户元数据
            const metadata = await this.getUserMetadata(publicKey);
            
            console.log('账号导入成功:', { npub, publicKey: publicKey.substring(0, 16) + '...' });
            
            return {
                privateKey,
                publicKey,
                npub,
                nsec,
                name: metadata?.name || '',
                about: metadata?.about || '',
                picture: metadata?.picture || '',
                nip05: metadata?.nip05 || ''
            };
            
        } catch (error) {
            console.error('导入账号失败:', error);
            throw error;
        }
    }

    // 设置用户
    async setUser(privateKey, publicKey) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        
        // 验证密钥对 (确保两个密钥都是正确的格式)
        const derivedPublicKey = getPublicKey(privateKey);
        if (derivedPublicKey !== publicKey) {
            throw new Error('私钥和公钥不匹配');
        }
        
        console.log('用户设置成功');
    }

    // 初始化中继连接
    async initializeRelays() {
        console.log('正在初始化中继连接...');
        
        const connectionPromises = this.relays.map(async (relay) => {
            try {
                await this.testRelayConnection(relay);
                this.connectionStatus.set(relay, 'connected');
                console.log(`✅ 中继连接成功: ${relay}`);
            } catch (error) {
                this.connectionStatus.set(relay, 'failed');
                console.error(`❌ 中继连接失败: ${relay}`, error.message);
            }
        });
        
        await Promise.allSettled(connectionPromises);
        
        const connectedCount = Array.from(this.connectionStatus.values()).filter(status => status === 'connected').length;
        console.log(`中继初始化完成: ${connectedCount}/${this.relays.length} 个中继连接成功`);
    }

    // 测试中继连接
    async testRelayConnection(relayUrl) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('连接超时'));
            }, 5000);
            
            try {
                console.log(`尝试连接到中继: ${relayUrl}`);
                const ws = new WebSocket(relayUrl);
                
                ws.onopen = () => {
                    console.log(`中继连接成功: ${relayUrl}`);
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                };
                
                ws.onerror = (error) => {
                    console.log(`中继连接失败: ${relayUrl}`, error);
                    clearTimeout(timeout);
                    reject(error);
                };
                
            } catch (error) {
                console.log(`中继连接异常: ${relayUrl}`, error);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    // 创建并签名事件
    createEvent(kind, content, tags = []) {
        if (!this.privateKey || !this.publicKey) {
            throw new Error('用户未设置，无法创建事件');
        }
        
        const event = {
            kind,
            content,
            tags,
            created_at: Math.floor(Date.now() / 1000),
            pubkey: this.publicKey
        };
        
        // 使用 finalizeEvent 完成事件签名
        const signedEvent = finalizeEvent(event, this.privateKey);
        
        // 验证事件
        const isValid = validateEvent(signedEvent);
        if (!isValid) {
            throw new Error('事件验证失败');
        }
        
        const isSignatureValid = verifyEvent(signedEvent);
        if (!isSignatureValid) {
            throw new Error('事件签名验证失败');
        }
        
        console.log('事件创建成功:', { kind, id: signedEvent.id.substring(0, 16) + '...' });
        return signedEvent;
    }

    // 发布事件 - 健壮版本
    async publishEvent(event) {
        if (!event.id || !event.sig) {
            throw new Error('事件未正确签名');
        }
        
        console.log('正在发布事件:', { 
            kind: event.kind, 
            id: event.id.substring(0, 16) + '...',
            relays: this.relays.length 
        });
        
        let successCount = 0;
        let totalAttempts = 0;
        const results = [];
        
        // 逐个尝试中继发布
        for (const relay of this.relays) {
            totalAttempts++;
            
            try {
                console.log(`尝试发布到: ${relay}`);
                
                // 创建临时连接池
                const tempPool = new SimplePool();
                
                // 发布事件并等待结果
                const publishResult = await new Promise((resolve, reject) => {
                    let resolved = false;
                    
                    // 设置较短的超时时间
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            tempPool.close([relay]);
                            reject(new Error('超时'));
                        }
                    }, 3000);
                    
                    try {
                        const pubs = tempPool.publish([relay], event);
                        
                        // 监听发布结果
                        pubs.on('ok', (relayUrl) => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                tempPool.close([relay]);
                                resolve({ success: true, relay: relayUrl });
                            }
                        });
                        
                        pubs.on('failed', (relayUrl, reason) => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                tempPool.close([relay]);
                                reject(new Error(reason));
                            }
                        });
                        
                        // 对于某些中继，可能没有明确的回调，等待一段时间后认为成功
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                tempPool.close([relay]);
                                resolve({ success: true, relay, assumed: true });
                            }
                        }, 1500);
                        
                    } catch (error) {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            tempPool.close([relay]);
                            reject(error);
                        }
                    }
                });
                
                // 发布成功
                successCount++;
                results.push({ relay, status: 'success', ...publishResult });
                console.log(`✅ 成功发布到: ${relay}${publishResult.assumed ? ' (假定成功)' : ''}`);
                
            } catch (error) {
                const errorMessage = error.message || '未知错误';
                results.push({ relay, status: 'failed', error: errorMessage });
                
                // 特殊错误处理
                if (errorMessage.includes('restricted') || errorMessage.includes('Pay on')) {
                    console.log(`⚠️ 中继 ${relay} 需要付费，跳过`);
                } else if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
                    console.log(`⏱️ 中继 ${relay} 连接超时，跳过`);
                } else {
                    console.error(`❌ 发布到 ${relay} 失败: ${errorMessage}`);
                }
            }
        }
        
        // 分析结果
        console.log(`发布完成: ${successCount}/${totalAttempts} 成功`);
        
        if (successCount > 0) {
            const successRelays = results.filter(r => r.status === 'success').map(r => r.relay);
            return { 
                event, 
                status: 'success',
                successCount,
                totalAttempts,
                successRelays,
                results,
                message: `成功发布到 ${successCount} 个中继: ${successRelays.join(', ')}`
            };
        } else {
            // 如果所有中继都失败，分析失败原因
            const restrictedRelays = results.filter(r => 
                r.error && (r.error.includes('restricted') || r.error.includes('Pay on'))
            );
            const timeoutRelays = results.filter(r => 
                r.error && (r.error.includes('超时') || r.error.includes('timeout'))
            );
            const otherErrors = results.filter(r => 
                r.error && !r.error.includes('restricted') && !r.error.includes('Pay on') && 
                !r.error.includes('超时') && !r.error.includes('timeout')
            );
            
            let errorMessage = '所有中继发布失败:\n';
            if (restrictedRelays.length > 0) {
                errorMessage += `- ${restrictedRelays.length} 个中继需要付费\n`;
            }
            if (timeoutRelays.length > 0) {
                errorMessage += `- ${timeoutRelays.length} 个中继连接超时\n`;
            }
            if (otherErrors.length > 0) {
                errorMessage += `- ${otherErrors.length} 个中继出现其他错误\n`;
            }
            
            throw new Error(errorMessage);
        }
    }

    // 查询事件
    async queryEvents(filter, timeout = 5000) {
        console.log('正在查询事件:', filter);
        
        const events = await this.pool.list(this.relays, [filter], { timeout });
        
        console.log(`查询完成: 找到 ${events.length} 个事件`);
        return events;
    }

    // 发布用户元数据
    async publishUserMetadata(name, about, picture = '', nip05 = '', website = '') {
        const metadata = {
            name,
            about,
            picture,
            nip05,
            website
        };
        
        const event = this.createEvent(
            this.eventKinds.METADATA,
            JSON.stringify(metadata)
        );
        
        const result = await this.publishEvent(event);
        this.userMetadata = metadata;
        
        return result;
    }

    // 获取用户元数据
    async getUserMetadata(pubkey) {
        try {
            const events = await this.queryEvents({
                kinds: [this.eventKinds.METADATA],
                authors: [pubkey],
                limit: 1
            });
            
            if (events.length > 0) {
                const metadata = JSON.parse(events[0].content);
                return {
                    ...metadata,
                    pubkey,
                    lastUpdated: events[0].created_at
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('获取用户元数据失败:', error);
            return null;
        }
    }

    // 发布长文章
    async publishArticle(title, content, summary = '') {
        const dTag = 'article_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        
        const event = this.createEvent(
            this.eventKinds.LONG_FORM,
            content,
            [
                ['d', dTag],
                ['title', title],
                ['summary', summary],
                ['published_at', Math.floor(Date.now() / 1000).toString()],
                ['alt', `这是一篇长文章: ${title}`]
            ]
        );
        
        return await this.publishEvent(event);
    }

    // 点赞文章
    async likeArticle(articleId, authorPubkey) {
        const event = this.createEvent(
            this.eventKinds.REACTION,
            '+',
            [
                ['e', articleId, '', '', authorPubkey],
                ['p', authorPubkey]
            ]
        );
        
        return await this.publishEvent(event);
    }

    // 收藏文章
    async bookmarkArticle(articleId, title = '') {
        // 获取当前收藏列表
        const currentBookmarks = await this.getCurrentBookmarks();
        
        // 检查是否已收藏
        const isAlreadyBookmarked = currentBookmarks.some(tag =>
            tag[0] === 'e' && tag[1] === articleId
        );
        
        if (isAlreadyBookmarked) {
            throw new Error('已经收藏过该文章');
        }
        
        // 添加新收藏
        const newBookmarks = [
            ...currentBookmarks,
            ['e', articleId, '']
        ];
        
        const event = this.createEvent(
            this.eventKinds.BOOKMARK,
            '',
            [
                ['title', title || '我的收藏'],
                ['description', '收藏的文章'],
                ...newBookmarks
            ]
        );
        
        return await this.publishEvent(event);
    }

    // 获取当前收藏列表
    async getCurrentBookmarks() {
        try {
            const events = await this.queryEvents({
                kinds: [this.eventKinds.BOOKMARK],
                authors: [this.publicKey],
                limit: 1
            });
            
            if (events.length > 0) {
                return events[0].tags.filter(tag => tag[0] === 'e');
            }
            
            return [];
            
        } catch (error) {
            console.error('获取收藏列表失败:', error);
            return [];
        }
    }

    // 关注作者
    async followAuthor(authorPubkey, alias = '') {
        // 获取当前关注列表
        const currentFollows = await this.getCurrentFollowList();
        
        // 检查是否已关注
        const isAlreadyFollowing = currentFollows.some(tag =>
            tag[0] === 'p' && tag[1] === authorPubkey
        );
        
        if (isAlreadyFollowing) {
            throw new Error('已经关注过该作者');
        }
        
        // 添加新关注
        const newFollowList = [
            ...currentFollows,
            ['p', authorPubkey, '', alias]
        ];
        
        const event = this.createEvent(
            this.eventKinds.CONTACT_LIST,
            '',
            newFollowList
        );
        
        return await this.publishEvent(event);
    }

    // 获取当前关注列表
    async getCurrentFollowList() {
        try {
            const events = await this.queryEvents({
                kinds: [this.eventKinds.CONTACT_LIST],
                authors: [this.publicKey],
                limit: 1
            });
            
            if (events.length > 0) {
                return events[0].tags.filter(tag => tag[0] === 'p');
            }
            
            return [];
            
        } catch (error) {
            console.error('获取关注列表失败:', error);
            return [];
        }
    }

    // 评论文章
    async commentOnArticle(articleId, authorPubkey, content) {
        // 使用 NIP-22 规范
        const articleATag = `30023:${authorPubkey}:${this.extractDTag(articleId)}`;
        
        const event = this.createEvent(
            this.eventKinds.COMMENT,
            content,
            [
                ['A', articleATag],
                ['K', '30023'],
                ['P', authorPubkey],
                ['k', '1111']
            ]
        );
        
        return await this.publishEvent(event);
    }

    // 获取文章评论
    async getArticleComments(articleATag) {
        try {
            const comments = await this.queryEvents({
                kinds: [this.eventKinds.COMMENT],
                '#A': [articleATag],
                limit: 100
            });
            
            return comments.sort((a, b) => a.created_at - b.created_at);
            
        } catch (error) {
            console.error('获取文章评论失败:', error);
            return [];
        }
    }

    // 获取时间线
    async getTimeline(limit = 20) {
        try {
            console.log('正在获取时间线...');
            
            // 获取关注列表
            const followList = await this.getCurrentFollowList();
            const followedAuthors = followList.map(tag => tag[1]);
            
            // 添加自己
            followedAuthors.push(this.publicKey);
            
            // 获取长文章
            const articles = await this.queryEvents({
                kinds: [this.eventKinds.LONG_FORM],
                authors: followedAuthors.length > 0 ? followedAuthors : undefined,
                limit
            });
            
            // 按时间排序
            articles.sort((a, b) => b.created_at - a.created_at);
            
            console.log(`时间线获取完成: ${articles.length} 篇文章`);
            return articles;
            
        } catch (error) {
            console.error('获取时间线失败:', error);
            return [];
        }
    }

    // 添加新的中继
    async addRelay(relayUrl) {
        if (this.relays.includes(relayUrl)) {
            throw new Error('该中继已存在');
        }
        
        // 测试连接
        await this.testRelayConnection(relayUrl);
        
        // 添加到列表
        this.relays.push(relayUrl);
        this.connectionStatus.set(relayUrl, 'connected');
        
        console.log('中继添加成功:', relayUrl);
    }

    // 获取中继列表
    getRelays() {
        return this.relays.map(url => ({
            url,
            connected: this.connectionStatus.get(url) === 'connected'
        }));
    }

    // 工具方法
    extractDTag(eventId) {
        // 从事件ID中提取 d 标签值
        // 这里简化处理，实际应用中需要查询事件获取真实的 d 标签
        return eventId.substring(0, 16);
    }

    getTagValue(tags, tagName) {
        const tag = tags.find(t => t[0] === tagName);
        return tag ? tag[1] : null;
    }

    truncateKey(key, length = 16) {
        if (!key) return '';
        return key.length > length ? key.substring(0, length) + '...' : key;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('zh-CN');
    }

    // 销毁连接
    destroy() {
        this.pool.close(this.relays);
        console.log('NostrClient 已销毁');
    }
}
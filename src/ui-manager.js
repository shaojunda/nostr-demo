export class UIManager {
    constructor() {
        this.currentSection = 'auth';
        this.currentTab = 'timeline';
    }

    init() {
        this.createMainUI();
        this.showSection('auth');
    }

    createMainUI() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <!-- 认证界面 -->
            <div id="auth-section" class="section">
                <h2>欢迎使用 Nostr Demo</h2>
                
                <div class="tabs">
                    <button class="tab active" data-tab="create">创建账号</button>
                    <button class="tab" data-tab="import">导入账号</button>
                </div>
                
                <div id="create-tab" class="tab-content active">
                    <div class="form-group">
                        <label for="userName">用户名:</label>
                        <input type="text" id="userName" placeholder="请输入用户名">
                    </div>
                    
                    <div class="form-group">
                        <label for="userAbout">个人简介:</label>
                        <textarea id="userAbout" placeholder="请输入个人简介"></textarea>
                    </div>
                    
                    <button id="createAccount">创建账号</button>
                </div>
                
                <div id="import-tab" class="tab-content">
                    <div class="form-group">
                        <label for="nsecInput">私钥 (nsec):</label>
                        <input type="password" id="nsecInput" placeholder="请输入 nsec 私钥">
                    </div>
                    
                    <button id="importAccount">导入账号</button>
                </div>
            </div>
            
            <!-- 主界面 -->
            <div id="main-section" class="section" style="display: none;">
                <!-- 用户信息 -->
                <div id="user-info" class="user-info">
                    <strong>用户:</strong> <span id="user-name"></span> 
                    (<span id="user-pubkey"></span>)
                    <br>
                    <strong>简介:</strong> <span id="user-about"></span>
                </div>
                
                <div class="tabs">
                    <button class="tab active" data-tab="timeline">时间线</button>
                    <button class="tab" data-tab="publish">发布文章</button>
                    <button class="tab" data-tab="relays">中继管理</button>
                </div>
                
                <!-- 时间线 -->
                <div id="timeline-tab" class="tab-content active">
                    <div style="margin-bottom: 20px;">
                        <button id="refreshTimeline">刷新时间线</button>
                    </div>
                    
                    <div id="timeline-content">
                        <div class="loading">加载时间线中</div>
                    </div>
                </div>
                
                <!-- 发布文章 -->
                <div id="publish-tab" class="tab-content">
                    <div class="form-group">
                        <label for="articleTitle">文章标题:</label>
                        <input type="text" id="articleTitle" placeholder="请输入文章标题">
                    </div>
                    
                    <div class="form-group">
                        <label for="articleContent">文章内容:</label>
                        <textarea id="articleContent" placeholder="请输入文章内容" rows="10"></textarea>
                    </div>
                    
                    <button id="publishArticle">发布文章</button>
                </div>
                
                <!-- 中继管理 -->
                <div id="relays-tab" class="tab-content">
                    <div class="form-group">
                        <label for="relayUrl">中继地址:</label>
                        <input type="url" id="relayUrl" placeholder="wss://relay.example.com">
                    </div>
                    
                    <button id="addRelay">添加中继</button>
                    
                    <div id="relay-list">
                        <h3>中继列表</h3>
                        <div id="relay-items"></div>
                    </div>
                </div>
            </div>
            
            <!-- 状态消息 -->
            <div id="status-message" style="display: none;"></div>
            
            <!-- 评论表单 -->
            <div id="comment-form" style="display: none;" class="section">
                <h3>发表评论</h3>
                <form id="commentForm">
                    <input type="hidden" name="articleId" id="comment-article-id">
                    <input type="hidden" name="authorPubkey" id="comment-author-pubkey">
                    
                    <div class="form-group">
                        <label for="comment-content">评论内容:</label>
                        <textarea name="content" id="comment-content" placeholder="请输入评论内容" required></textarea>
                    </div>
                    
                    <button type="submit">发布评论</button>
                    <button type="button" onclick="document.getElementById('comment-form').style.display='none'">取消</button>
                </form>
            </div>
        `;
        
        // 绑定标签切换事件
        this.bindTabEvents();
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.dataset.tab;
                this.switchTab(tabType);
            });
        });
    }

    switchTab(tabType) {
        // 更新标签状态
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            }
        });
        
        // 更新内容显示
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const activeContent = document.getElementById(tabType + '-tab');
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'block';
        }
        
        this.currentTab = tabType;
    }

    showSection(sectionName) {
        const sections = ['auth-section', 'main-section'];
        
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        const activeSection = document.getElementById(sectionName + '-section');
        if (activeSection) {
            activeSection.style.display = 'block';
        }
        
        this.currentSection = sectionName;
    }

    showUserInfo(user) {
        document.getElementById('user-name').textContent = user.name || '未设置';
        document.getElementById('user-pubkey').textContent = this.truncateKey(user.publicKey);
        document.getElementById('user-about').textContent = user.about || '未设置';
    }

    showTimeline(articles) {
        const timelineContent = document.getElementById('timeline-content');
        
        if (articles.length === 0) {
            timelineContent.innerHTML = '<div class="status info">暂无文章</div>';
            return;
        }
        
        let html = '';
        articles.forEach(article => {
            const title = this.getTagValue(article.tags, 'title') || '无标题';
            const publishedAt = this.getTagValue(article.tags, 'published_at');
            const timeStr = publishedAt ? this.formatTime(parseInt(publishedAt)) : this.formatTime(article.created_at);
            
            html += `
                <div class="article-item">
                    <div class="article-title">${this.escapeHtml(title)}</div>
                    <div class="article-content">${this.escapeHtml(article.content.substring(0, 200))}${article.content.length > 200 ? '...' : ''}</div>
                    <div class="article-meta">
                        作者: ${this.truncateKey(article.pubkey)} | 
                        发布时间: ${timeStr}
                    </div>
                    <div class="article-actions">
                        <button class="like-btn" data-article-id="${article.id}" data-author-pubkey="${article.pubkey}">
                            👍 点赞
                        </button>
                        <button class="bookmark-btn" data-article-id="${article.id}" data-title="${this.escapeHtml(title)}">
                            📚 收藏
                        </button>
                        <button class="follow-btn" data-author-pubkey="${article.pubkey}" data-author-name="${this.truncateKey(article.pubkey)}">
                            👥 关注
                        </button>
                        <button class="comment-btn" data-article-id="${article.id}" data-author-pubkey="${article.pubkey}">
                            💬 评论
                        </button>
                    </div>
                </div>
            `;
        });
        
        timelineContent.innerHTML = html;
    }

    updateRelayList(relays) {
        const relayItems = document.getElementById('relay-items');
        
        let html = '';
        relays.forEach(relay => {
            html += `
                <div class="relay-item">
                    <div>
                        <span class="relay-status ${relay.connected ? 'connected' : 'disconnected'}"></span>
                        ${relay.url}
                    </div>
                    <div>${relay.connected ? '已连接' : '未连接'}</div>
                </div>
            `;
        });
        
        relayItems.innerHTML = html;
    }

    showCommentForm(articleId, authorPubkey) {
        document.getElementById('comment-article-id').value = articleId;
        document.getElementById('comment-author-pubkey').value = authorPubkey;
        document.getElementById('comment-form').style.display = 'block';
        document.getElementById('comment-content').focus();
    }

    hideCommentForm() {
        document.getElementById('comment-form').style.display = 'none';
        document.getElementById('comment-content').value = '';
    }

    showLoading(message) {
        this.showStatus(message, 'info');
    }

    showSuccess(message) {
        this.showStatus(message, 'success');
    }

    showError(message) {
        this.showStatus(message, 'error');
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status-message');
        statusDiv.className = `status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // 工具方法
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
// Nostr Demo 应用主入口
import { NostrClient } from './nostr-client.js';
import { UIManager } from './ui-manager.js';

class NostrApp {
    constructor() {
        this.nostrClient = new NostrClient();
        this.uiManager = new UIManager();
        
        // 绑定事件
        this.bindEvents();
    }

    async init() {
        try {
            // 初始化UI
            this.uiManager.init();
            
            // 尝试从localStorage恢复用户信息
            const savedUser = localStorage.getItem('nostr-user');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                // 将保存的私钥转换为 Uint8Array
                if (user.privateKey && Array.isArray(user.privateKey)) {
                    const privateKey = new Uint8Array(user.privateKey);
                    await this.nostrClient.setUser(privateKey, user.publicKey);
                    this.uiManager.showUserInfo(user);
                    this.uiManager.showSection('main');
                } else {
                    console.log('无效的私钥格式，清除本地存储');
                    localStorage.removeItem('nostr-user');
                    this.uiManager.showSection('auth');
                }
            } else {
                this.uiManager.showSection('auth');
            }
            
            // 初始化relay连接
            await this.nostrClient.initializeRelays();
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.uiManager.showError('应用初始化失败: ' + error.message);
        }
    }

    bindEvents() {
        // 创建账号
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'createAccount') {
                await this.handleCreateAccount();
            }
            
            // 导入账号
            if (e.target.id === 'importAccount') {
                await this.handleImportAccount();
            }
            
            // 发布文章
            if (e.target.id === 'publishArticle') {
                await this.handlePublishArticle();
            }
            
            // 刷新时间线
            if (e.target.id === 'refreshTimeline') {
                await this.handleRefreshTimeline();
            }
            
            // 添加relay
            if (e.target.id === 'addRelay') {
                await this.handleAddRelay();
            }
            
            // 处理文章操作
            if (e.target.classList.contains('like-btn')) {
                await this.handleLikeArticle(e.target);
            }
            
            if (e.target.classList.contains('bookmark-btn')) {
                await this.handleBookmarkArticle(e.target);
            }
            
            if (e.target.classList.contains('follow-btn')) {
                await this.handleFollowAuthor(e.target);
            }
            
            if (e.target.classList.contains('comment-btn')) {
                await this.handleCommentArticle(e.target);
            }
        });

        // 表单提交
        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (e.target.id === 'commentForm') {
                await this.handleSubmitComment(e.target);
            }
        });

        // 标签切换
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                this.uiManager.switchTab(e.target.dataset.tab);
            }
        });
    }

    async handleCreateAccount() {
        try {
            this.uiManager.showLoading('创建账号中...');
            
            const name = document.getElementById('userName').value;
            const about = document.getElementById('userAbout').value;
            
            console.log('开始创建账号:', { name, about });
            const user = await this.nostrClient.createAccount(name, about);
            console.log('账号创建成功:', user);
            
            // 保存用户信息到localStorage (确保私钥正确序列化)
            const userToSave = {
                ...user,
                privateKey: Array.from(user.privateKey) // 将 Uint8Array 转换为普通数组
            };
            localStorage.setItem('nostr-user', JSON.stringify(userToSave));
            
            this.uiManager.showSuccess('账号创建成功！');
            this.uiManager.showUserInfo(user);
            this.uiManager.showSection('main');
            
        } catch (error) {
            console.error('创建账号失败:', error);
            this.uiManager.showError('创建账号失败: ' + error.message);
        }
    }

    async handleImportAccount() {
        try {
            this.uiManager.showLoading('导入账号中...');
            
            const nsec = document.getElementById('nsecInput').value;
            const user = await this.nostrClient.importAccount(nsec);
            
            // 保存用户信息到localStorage (确保私钥正确序列化)
            const userToSave = {
                ...user,
                privateKey: Array.from(user.privateKey) // 将 Uint8Array 转换为普通数组
            };
            localStorage.setItem('nostr-user', JSON.stringify(userToSave));
            
            this.uiManager.showSuccess('账号导入成功！');
            this.uiManager.showUserInfo(user);
            this.uiManager.showSection('main');
            
        } catch (error) {
            console.error('导入账号失败:', error);
            this.uiManager.showError('导入账号失败: ' + error.message);
        }
    }

    async handlePublishArticle() {
        try {
            this.uiManager.showLoading('发布文章中...');
            
            const title = document.getElementById('articleTitle').value;
            const content = document.getElementById('articleContent').value;
            
            if (!title || !content) {
                this.uiManager.showError('请填写文章标题和内容');
                return;
            }
            
            const article = await this.nostrClient.publishArticle(title, content);
            
            this.uiManager.showSuccess('文章发布成功！');
            
            // 清空表单
            document.getElementById('articleTitle').value = '';
            document.getElementById('articleContent').value = '';
            
            // 刷新时间线
            await this.handleRefreshTimeline();
            
        } catch (error) {
            console.error('发布文章失败:', error);
            this.uiManager.showError('发布文章失败: ' + error.message);
        }
    }

    async handleRefreshTimeline() {
        try {
            this.uiManager.showLoading('刷新时间线中...');
            
            const articles = await this.nostrClient.getTimeline();
            this.uiManager.showTimeline(articles);
            
        } catch (error) {
            console.error('刷新时间线失败:', error);
            this.uiManager.showError('刷新时间线失败: ' + error.message);
        }
    }

    async handleAddRelay() {
        try {
            const relayUrl = document.getElementById('relayUrl').value;
            
            if (!relayUrl) {
                this.uiManager.showError('请输入中继地址');
                return;
            }
            
            this.uiManager.showLoading('连接中继中...');
            
            await this.nostrClient.addRelay(relayUrl);
            
            this.uiManager.showSuccess('中继连接成功！');
            this.uiManager.updateRelayList(this.nostrClient.getRelays());
            
            // 清空输入框
            document.getElementById('relayUrl').value = '';
            
        } catch (error) {
            console.error('连接中继失败:', error);
            this.uiManager.showError('连接中继失败: ' + error.message);
        }
    }

    async handleLikeArticle(button) {
        try {
            const articleId = button.dataset.articleId;
            const authorPubkey = button.dataset.authorPubkey;
            
            await this.nostrClient.likeArticle(articleId, authorPubkey);
            
            // 更新UI
            button.classList.add('active');
            button.textContent = '已点赞';
            
            this.uiManager.showSuccess('点赞成功！');
            
        } catch (error) {
            console.error('点赞失败:', error);
            this.uiManager.showError('点赞失败: ' + error.message);
        }
    }

    async handleBookmarkArticle(button) {
        try {
            const articleId = button.dataset.articleId;
            const title = button.dataset.title;
            
            await this.nostrClient.bookmarkArticle(articleId, title);
            
            // 更新UI
            button.classList.add('active');
            button.textContent = '已收藏';
            
            this.uiManager.showSuccess('收藏成功！');
            
        } catch (error) {
            console.error('收藏失败:', error);
            this.uiManager.showError('收藏失败: ' + error.message);
        }
    }

    async handleFollowAuthor(button) {
        try {
            const authorPubkey = button.dataset.authorPubkey;
            const authorName = button.dataset.authorName;
            
            await this.nostrClient.followAuthor(authorPubkey, authorName);
            
            // 更新UI
            button.classList.add('active');
            button.textContent = '已关注';
            
            this.uiManager.showSuccess('关注成功！');
            
        } catch (error) {
            console.error('关注失败:', error);
            this.uiManager.showError('关注失败: ' + error.message);
        }
    }

    async handleCommentArticle(button) {
        try {
            const articleId = button.dataset.articleId;
            const authorPubkey = button.dataset.authorPubkey;
            
            // 显示评论框
            this.uiManager.showCommentForm(articleId, authorPubkey);
            
        } catch (error) {
            console.error('显示评论框失败:', error);
            this.uiManager.showError('显示评论框失败: ' + error.message);
        }
    }

    async handleSubmitComment(form) {
        try {
            const formData = new FormData(form);
            const content = formData.get('content');
            const articleId = formData.get('articleId');
            const authorPubkey = formData.get('authorPubkey');
            
            if (!content) {
                this.uiManager.showError('请输入评论内容');
                return;
            }
            
            this.uiManager.showLoading('发布评论中...');
            
            await this.nostrClient.commentOnArticle(articleId, authorPubkey, content);
            
            this.uiManager.showSuccess('评论发布成功！');
            
            // 清空表单
            form.reset();
            
            // 隐藏评论框
            this.uiManager.hideCommentForm();
            
        } catch (error) {
            console.error('发布评论失败:', error);
            this.uiManager.showError('发布评论失败: ' + error.message);
        }
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', async () => {
    const app = new NostrApp();
    await app.init();
});
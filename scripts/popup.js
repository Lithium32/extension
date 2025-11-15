// popup.js
// 立即检查并设置全局标志
if (window.popupScriptExecuted) {
    // 直接退出，不执行任何代码
    try {
        throw new Error('popup.js already executed');
    } catch (error) {
        console.log('🚨 popup.js 已经被执行过了！阻止重复执行');
    }
}

window.popupScriptExecuted = true;
console.log('✅ popup.js 开始执行 - 首次加载');


class PopupManager {
    constructor() {
        if (PopupManager.instance) {
            return PopupManager.instance;
        }
        PopupManager.instance = this;
        console.log('Creating new PopupManager instance.');
        this.currentTab = 'errors';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // 标签切换
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 按钮事件
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        console.trace('事件监听器绑定位置'); // 这会显示调用堆栈
        document.getElementById('downloadBtn').addEventListener('click', () => {
            console.log('click on 下载报告...');
            console.trace('点击事件触发堆栈'); // 查看点击时的调用堆栈
            this.downloadReport();
        });

       

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearData();
        });
    }

    switchTab(tabName) {
        // 更新标签状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        this.currentTab = tabName;
        
        // 根据需要加载标签数据
        if (tabName === 'stats') {
            this.loadStats();
        } else if (tabName === 'actions') {
            this.loadActions();
        }
    }

    // 与 background 通信的通用方法
    async sendMessageToBackground(type, data = {}) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type, ...data }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('通信错误:', chrome.runtime.lastError);
                    resolve({ status: 'error', message: chrome.runtime.lastError.message });
                } else {
                    resolve(response);
                }
            });
        });
    }

    async loadData() {
        try {
            this.showLoading();
            
            // // 获取统计信息
            // const statsResponse = await this.sendMessageToBackground('GET_STATS');
            // if (statsResponse.status === 'success') {
            //     this.updateStats(statsResponse.data);
            // }
            
            // 获取详细报告
            const reportResponse = await this.sendMessageToBackground('GET_REPORT');
            if (reportResponse.status === 'success') {
                this.updateErrorList(reportResponse.data);
            }
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('加载数据失败: ' + error.message);
        }
    }

    async loadStats() {
        const response = await this.sendMessageToBackground('GET_ERROR_REPORT');
        if (response.status === 'success') {
            this.updateStatsContent(response.data);
        }
    }

    async loadActions() {
        const response = await this.sendMessageToBackground('GET_USER_ACTION_HISTORY');
        if (response.status === 'success') {
            this.updateActionsContent(response.data);
        }
    }

    updateStats(stats) {
        document.getElementById('totalErrors').textContent = stats.totalErrors;
        document.getElementById('totalActions').textContent = stats.totalActions;
        document.getElementById('errorRate').textContent = stats.errorRate;
        
        // 根据错误率设置颜色
        const errorRateElement = document.getElementById('errorRate');
        const rate = parseFloat(stats.errorRate);
        errorRateElement.className = 'stat-value error-rate ';
        if (rate > 10) errorRateElement.className += 'high';
        else if (rate > 5) errorRateElement.className += 'medium';
        else errorRateElement.className += 'low';
    }

    updateErrorList(report) {
        const errorList = document.getElementById('errorList');
        debugger;
        if (!report.detailedErrors || report.detailedErrors.length === 0) {
            errorList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">✅</div>
                    <div>暂无错误记录</div>
                    <div style="font-size: 11px; margin-top: 8px;">监控运行正常，未发现业务错误</div>
                </div>
            `;
            return;
        }

        const errorsHtml = report.detailedErrors.slice(-10).reverse().map(error => {
            const errorMessage = error.responseData?.message || error.responseData?.msg || '未知错误';
            const actionDescription = error.actionDescription || '未知操作';
            const time = new Date(error.timestamp).toLocaleTimeString();
            
            return `
                <div class="error-item">
                    <div class="error-header">
                        <div class="error-api">${error.method} ${error.api}</div>
                        <div class="error-status">${error.httpStatus}</div>
                    </div>
                    <div class="error-message">${this.escapeHtml(errorMessage)}</div>
                    <div class="error-action">触发操作: ${this.escapeHtml(actionDescription)}</div>
                    <div class="error-time">${time}</div>
                </div>
            `;
        }).join('');

        errorList.innerHTML = errorsHtml;
    }

    updateStatsContent(report) {
        const statsContent = document.getElementById('statsContent');
        
        if (!report.summary) {
            statsContent.innerHTML = '<div class="empty-state">暂无统计数据</div>';
            return;
        }

        const errorsByType = Object.entries(report.summary.errorsByType || {});
        const topApis = report.summary.topErrorAPIs || [];
        const commonErrors = report.summary.mostCommonErrors || [];

        statsContent.innerHTML = `
            <div style="display: grid; gap: 12px;">
                <div class="stat-card">
                    <div class="stat-label">错误类型分布</div>
                    ${errorsByType.map(([type, errors]) => `
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                            <span>${type}</span>
                            <span style="color: #e74c3c;">${errors.length} 次</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">高频错误接口</div>
                    ${topApis.map(([api, count]) => `
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${api}</span>
                            <span style="color: #e74c3c; flex-shrink: 0;">${count} 次</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">常见错误信息</div>
                    ${commonErrors.map(([message, count]) => `
                        <div style="font-size: 11px; margin-top: 4px; color: #666;">
                            ${this.escapeHtml(message)} <span style="color: #e74c3c;">(${count})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    updateActionsContent(actionList) {
        const actionsContent = document.getElementById('actionsContent');
        debugger;
        if (!actionList || actionList.length === 0) {
            actionsContent.innerHTML = '<div class="empty-state">暂无操作记录</div>';
            return;
        }
        console.log('actionList length=>', actionList.length);

        // 只显示最近的50条操作并按时间倒排，即最近操作的一条记录放在最上面
        actionList = actionList.slice(-50).reverse();
        const actionsHtml = actionList.map(action => {
            const time = new Date(action.timestamp).toLocaleTimeString();
            const elementInfo = action.element ? 
                `${action.element.tagName}${action.element.id ? '#' + action.element.id : ''}` : 
                action.type;
            
            return `
                <div class="error-item">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <div style="font-weight: 600; color: #333;">${action.type}</div>
                        <span/>
                        <div style="font-size: 10px; color: #999;">${time}</div>
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        元素: ${this.escapeHtml(elementInfo)}
                    </div>
                    ${action.element?.text ? `
                        <div style="font-size: 11px; color: #888; margin-top: 2px;">
                            文本: ${this.escapeHtml(action.element.text)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        actionsContent.innerHTML = actionsHtml;
    }

    async downloadReport() {
        const response = await this.sendMessageToBackground('GET_REPORT');
        if (response.status === 'success') {
            const report = response.data;
            const blob = new Blob([JSON.stringify(report, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const filename = `business-error-report-${new Date().toISOString().split('T')[0]}.json`;
            
            // 创建临时链接进行下载
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理 URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            // this.showMessage('开始下载报告...');
        } else {
            this.showError('下载失败: ' + response.message);
        }
    }

    async clearData() {
        if (confirm('确定要清空所有监控数据吗？此操作不可恢复！')) {
            const response = await this.sendMessageToBackground('CLEAR_DATA');
            if (response.status === 'success') {
                this.showMessage('数据已清空');
                await this.loadData(); // 重新加载空数据
            } else {
                this.showError('清空失败: ' + response.message);
            }
        }
    }

    showLoading() {
        // 可以添加加载动画
        console.log('加载数据中...');
    }

    showMessage(message) {
        // 简单的消息提示
        const originalText = document.getElementById('refreshBtn').textContent;
        document.getElementById('refreshBtn').textContent = '✅ ' + message;
        setTimeout(() => {
            document.getElementById('refreshBtn').textContent = originalText;
        }, 2000);
    }

    showError(message) {
        console.error('错误:', message);
        // 可以添加更友好的错误提示
        alert('错误: ' + message);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    startAutoRefresh() {
        // 每30秒自动刷新一次
        setInterval(() => {
            this.loadData();
        }, 30000);
    }
}

// 初始化 popup
let popupManagerInstance = null;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOMContentLoaded');
    if (popupManagerInstance) {
        console.warn('PopupManager 已经存在实例，跳过创建');
        return;
    }
    
    popupManagerInstance = new PopupManager();
});
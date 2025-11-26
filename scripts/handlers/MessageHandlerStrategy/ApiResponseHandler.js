// handlers/ApiResponseHandler.js
import MessageHandler from '../MessageHandler.js';
import ErrorConfig from '../../../scripts/config.js';
import randomUtils from '../../utils/random.js';
import storageUtils from '../../utils/storage.js'
import {getActionDescription} from './GetReportHandler.js';
/**
 * API响应消息处理器
 * 
 */
class ApiResponseHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = ['API_RESPONSE'];
        this.errorConfig = ErrorConfig.getErrorConfig();
        this.userActions = null;
        this.businessErrors = null;
        console.log('Current Error Config:', this.errorConfig);
    }
    supports(messageType) {
        if (messageType) {
            return this.handleType.includes(messageType);
        }
        return false;
    }

    async handle(data, context, type) {
        this.userActions = context.userActions;
        this.businessErrors = context.businessErrors;
        console.log('📨 处理API响应:', data.data.url);
        this.handleAPIResponse(data);
        context.userActions = this.userActions;
        context.businessErrors = this.businessErrors;
        return { status: 'received' };
    }

    handleAPIResponse(errorData) {
        if (ErrorConfig.isBusinessError(errorData.data.url, errorData.data.responseData)) {
            this.captureBusinessError(errorData);
        }
    }

    
    async captureBusinessError(errorData) {
        const errorRecord = {
            ...errorData,
            id: randomUtils.generateId(),
            capturedAt: new Date().toISOString()
        };

        this.businessErrors.push(errorRecord);
        
        // 限制存储数量
        if (this.businessErrors.length > 100) {
            this.businessErrors = this.businessErrors.slice(-50);
        }

        const data = {
            userActions: this.userActions,
            businessErrors: this.businessErrors,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        storageUtils.saveToLocalStorage('businessMonitorData', data);

        try {
            // 捕获当前可见标签页的截图
            const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: 'png' // 支持 'png'、'jpeg'、'webp'
            });
            
            // 处理截图结果
            console.log('截图成功！');
            
            // 这里可以添加后续处理，例如：
            // 1. 在新窗口中显示截图
            // 2. 下载截图
            // 3. 将截图复制到剪贴板
            chrome.downloads.download({
                url: dataUrl,
                filename: 'screenshot.png'
            });
        } catch (error) {
            console.error('截图失败:', error);
        }

        this.sendRealTimeNotification(errorRecord);
        
        console.log('🔴 Business Error Captured:', errorRecord);
    }

    sendRealTimeNotification(error) {
        const actionDescription = getActionDescription(error.data.triggeredBy);
        const errorMessage = error.responseData?.message || 
                           error.responseData?.msg || 
                           error.responseData?.error || 
                           '业务错误';

        // 创建浏览器通知
        chrome.notifications.create(error.id, {
            type: 'basic',
            iconUrl: './image/icon.png',
            title: '🚨 业务错误告警',
            message: `操作 "${actionDescription}" 触发错误: ${errorMessage}`,
            priority: 2
        });

        // 可以在这里集成企业微信、钉钉等webhook通知
        // this.sendToWebhook(error);
    }

}

export default ApiResponseHandler;
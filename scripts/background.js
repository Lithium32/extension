// background.js - 业务错误监控和报告生成
import ErrorConfig from './config.js';
import storageUtils from './utils/storage.js';      
import MessageHandlerRegistry from './registry/MessageHandlerRegistry.js';
import { messageHandlers } from './handlers/index.js';  


class BusinessErrorMonitor {
    constructor() {
        this.userActions = [];
        this.businessErrors = [];
        this.errorConfig = ErrorConfig.getErrorConfig();
        this.setupMessageListener();

        this.handlerRegistry = new MessageHandlerRegistry();
        this.initializeHandlers();
        console.log('🔧 BusinessErrorMonitor initialized');
        // console.log('Current Error Config:', this.errorConfig);
    }

    initializeHandlers() {
        // 获取所有处理器类
        const handlerClasses = Object.values(messageHandlers);
        // 创建实例并注册
        handlerClasses.forEach(HandlerClass => {
            const handler = new HandlerClass();
            this.handlerRegistry.register(handler);
        });
        // 注册默认处理器
        // this.handlerRegistry.registerDefault(new DefaultMessageHandler());
        console.log(`📋 已注册 ${this.handlerRegistry.getRegisteredTypes().length} 种消息处理器`);
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📩 Message received in background:', message.type);
            this.handleMessage(message, sender)
                .then(response => {
                    sendResponse(response);
                })
                .catch(error => {
                    console.error('❌ 消息处理失败:', error);
                    sendResponse({ 
                        status: 'error', 
                        message: error.message 
                    });
                });

            return true; // 保持消息通道开放，支持异步响应
        });
    }

    /**
     * 处理消息 - 使用策略模式
     * @param {Object} message 消息对象
     * @param {Object} sender 发送者信息
     * @returns {Promise<Object>} 响应结果
     */
    async handleMessage(message, sender) {
        const { type, data = {} } = message;
        // 查询支持处理该消息类型的处理器
        const handler = this.handlerRegistry.getHandler(type);
        if (!handler) {
            console.warn(`⚠️ 未找到消息处理器: ${type}`);
            return { status: 'no_handler_found' };
        }
        try {
            console.log(`🎯 使用处理器: ${handler.constructor.name} 处理消息: ${type}`);
            const result = await handler.handle(data, this, type);
            console.log(`✅ 消息处理完成: ${type}`, result.status);
            return result;
        } catch (error) {
            console.error(`❌ 消息处理失败: ${type}`, error);
            throw error;
        }
    }

    handleNetworkError(data) {
        this.captureBusinessError({
            ...data,
            type: 'NETWORK_ERROR',
            responseData: { error: data.error }
        });
    }

    async loadFromStorage() {
        try{
            const result = storageUtils.loadFromLocalStorage('businessMonitorData');
            if (result.businessMonitorData) {
                this.userActions = result.businessMonitorData.userActions || [];
                this.businessErrors = result.businessMonitorData.businessErrors || [];
            }
            return result.businessMonitorData;
        } catch (error) {
            return { userActions: [], businessErrors: [] };
        }
    }
}

// 初始化监控器
const businessMonitor = new BusinessErrorMonitor();

// 加载存储的数据
businessMonitor.loadFromStorage();

// 暴露到全局用于调试
self.businessMonitor = businessMonitor;

console.log('🚀 Background script loaded successfully');

// 当用户点击浏览器工具栏上的扩展图标时，打开侧边栏
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
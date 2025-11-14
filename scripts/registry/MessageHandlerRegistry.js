// registry/MessageHandlerRegistry.js
/**
 * 消息处理器注册表
 */
class MessageHandlerRegistry {
    constructor() {
        this.handlers = new Map();
        this.defaultHandler = null;
    }
    

    /**
     * 注册消息处理器
     * @param {MessageHandler} handler 消息处理器
     */
    register(handler) {
        if (typeof handler.supports !== 'function') {
            throw new Error('处理器必须实现supports方法');
        }
        if (typeof handler.handle !== 'function') {
            throw new Error('处理器必须实现handle方法');
        }
        // 注册该消息类型的处理器
        const type = handler.supports();
        if(!this.handlers.get(type)){
            this.handlers.set(type, handler);
            console.log(`✅ 注册消息处理器: ${type} -> ${handler.constructor.name}`);
        }
    }

    /**
     * 注册默认处理器（处理未知消息类型）
     * @param {MessageHandler} handler 默认处理器
     */
    registerDefault(handler) {
        this.defaultHandler = handler;
        console.log(`✅ 注册默认消息处理器: ${handler.constructor.name}`);
    }

    /**
     * 获取消息处理器
     * @param {string} messageType 消息类型
     * @returns {MessageHandler|null} 消息处理器
     */
    getHandler(messageType) {
        return this.handlers.get(messageType) || this.defaultHandler;
    }

    /**
     * 获取所有已注册的消息类型
     * @returns {string[]}
     */
    getRegisteredTypes() {
        return Array.from(this.handlers.keys());
    }

    /**
     * 清空注册表
     */
    clear() {
        this.handlers.clear();
        this.defaultHandler = null;
        console.log('🗑️ 消息处理器注册表已清空');
    }
}

export default MessageHandlerRegistry;
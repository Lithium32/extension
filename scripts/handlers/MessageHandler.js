// handlers/MessageHandler.js
/**
 * 消息处理器策略接口
 */
class MessageHandler {
    constructor() {
        if (new.target === MessageHandler) {
            throw new TypeError('不能直接实例化抽象类 MessageHandler');
        }
    }
    /**
     * 处理消息
     * @param {Object} data 消息数据
     * @param {Object} context 处理上下文（BusinessErrorMonitor实例）
     * @returns {Promise<Object>} 响应结果
     */
    async handle(data, context, type) {
        throw new Error('必须实现handle方法');
    }

    /**
     * 支持的消息类型
     * @returns {messageType} 消息类型
     */
    supports(messageType) {
        throw new Error('必须实现supports方法');
    }
}

export default MessageHandler;
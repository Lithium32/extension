// handlers/DefaultMessageHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 默认消息处理器（处理未知消息类型）
 */
class DefaultMessageHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = 'DEFAULT';
    }
    supports() {
        return true; // 支持所有消息类型
    }

    async handle(data, context, type) {
        console.warn(`⚠️ 未知消息类型: ${data.type || 'unknown'}`);
        return { status: 'unknown_message_type' };
    }
}

export default DefaultMessageHandler;
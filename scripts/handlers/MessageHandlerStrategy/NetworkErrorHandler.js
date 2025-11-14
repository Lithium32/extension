// handlers/NetworkErrorHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 网络错误消息处理器
 */
class NetworkErrorHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = ['NETWORK_ERROR'];
    }
    supports(messageType) {
        if (messageType) {
            return this.handleType.includes(messageType);
        }
        return false;
    }

    async handle(data, context, type) {
        console.log('🌐 处理网络错误:', data.error);
        context.handleNetworkError(data);
        return { status: 'received' };
    }
}

export default NetworkErrorHandler;
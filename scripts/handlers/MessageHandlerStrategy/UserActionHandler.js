// handlers/UserActionHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 用户操作消息处理器
 */
class UserActionHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = ['USER_ACTION'];
    }

    supports(messageType) {
        if (messageType) {
            return this.handleType.includes(messageType);
        }
        return false;
    }

    async handle(data, context, type) {
        console.log('🎯 处理用户操作:', data);
        const action = data;
        if (context && Array.isArray(context.userActions)) {
            context.userActions.push(action);
        }
        // 限制存储数量
        if (context.userActions.length > 200) {
            context.userActions = context.userActions.slice(-100);
        }
        console.log('📝 User action stored:', action);
        return { status: 'received' };
    }

}

export default UserActionHandler;
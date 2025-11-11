// bridge.js - 在隔离世界中运行，可以访问 chrome API
class MessageBridge {
    constructor() {
        this.setupMessageListener();
        console.log('🌉 消息桥接器初始化');
    }

    setupMessageListener() {
        // 监听来自页面主世界的消息
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data.source === 'PAGE_SCRIPT') {
                console.log('🌉 桥接收到的消息:', event.data);
                
                // 转发到 background
                this.sendToBackground(event.data);
            }
        });
    }

    sendToBackground(message) {
        chrome.runtime.sendMessage({
            type: message.type,
            data: message.data
        }, (response) => {
            console.log('📨 背景响应:', response);
        });
    }

    // 发送消息到页面主世界
    sendToPage(message) {
        window.postMessage({
            type: 'EXTENSION_' + message.type,
            data: message.data,
            source: 'EXTENSION_SCRIPT'
        }, '*');
    }
}

// 初始化桥接
const messageBridge = new MessageBridge();
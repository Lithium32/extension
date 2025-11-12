// 现代网页（特别是 React、Vue 等框架）和浏览器扩展的 content script 运行在不同的 JavaScript 执行环境中
// 方案一：使用 world: "MAIN";方案二：在 content.js 中添加脚本注入到页面主上下文中.
// 在 world: "MAIN" 模式下，content script 运行在页面的主上下文中，
// 但 chrome.runtime API 只在扩展的隔离上下文中可用
// 在主世界中只能使用 window.postMessage 通信
// bridge.js - 在隔离世界中运行，可以访问 chrome API
// 在 world: "MAIN" 的 content.js 中不能直接引用 world: "ISOLATED" 的 bridge.js 中的函数，
// 因为它们运行在不同的 JavaScript 上下文中。需要使用消息传递机制：window.postMessage
// bridge.js同时监听来自主世界（用于将消息从content发送到background）
// 和来自background（用于将消息从background发送到主世界）的消息
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
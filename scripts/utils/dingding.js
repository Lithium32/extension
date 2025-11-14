export const dingUtils = {
    // 发送钉钉消息的函数
    sendDingTalkMessage(webhookUrl, message) {  
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                msgtype: 'text',
                text: {
                    content: message
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('DingTalk message sent successfully:', data);
        })
        .catch(error => {
            console.error('Error sending DingTalk message:', error);
        });
    },

    // sendToWebhook(error) {
    //     // 示例：发送到企业微信
    //     const webhookData = {
    //         msgtype: "markdown",
    //         markdown: {
    //             title: "业务错误告警",
    //             text: `### 🚨 业务错误告警\n**操作:** ${this.getActionDescription(error.triggeredBy)}\n**接口:** ${error.method} ${error.url}\n**错误:** ${error.responseData?.message || '未知错误'}\n**时间:** ${new Date(error.timestamp).toLocaleString()}`
    //         }
    //     };
        
    //     fetch('YOUR_WEBHOOK_URL', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(webhookData)
    //     });
    // }

};
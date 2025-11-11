// 从storage中获取错误报告并展示
chrome.storage.local.get('errorReports', function(data) {
  const reports = data.errorReports || [];
  const container = document.getElementById('reports');

  if (reports.length === 0) {
    container.innerHTML = '<p>暂无报错</p>';
    return;
  }

//   reports.forEach((report, index) => {
//     const div = document.createElement('div');
//     div.className = 'error-item';
//     div.innerHTML = `
//       <h3>报错 ${index + 1}</h3>
//       <div class="user-action">
//         <strong>触发操作：</strong>
//         <div>元素: ${report.userAction.tag}</div>
//         <div>ID: ${report.userAction.id}</div>
//         <div>类名: ${report.userAction.className}</div>
//         <div>文本: ${report.userAction.text}</div>
//         <div>XPath: ${report.userAction.xpath}</div>
//         <div>CSS选择器: ${report.userAction.cssSelector}</div>
//         <div>时间: ${new Date(report.userAction.timestamp).toLocaleString()}</div>
//       </div>
//       <div class="error-request">
//         <strong>报错接口：</strong>
//         <div>URL: ${report.errorRequest.url}</div>
//         <div>方法: ${report.errorRequest.method}</div>
//         <div>状态码: ${report.errorRequest.statusCode}</div>
//         <div>时间: ${new Date(report.errorRequest.timestamp).toLocaleString()}</div>
//       </div>
//     `;
//     container.appendChild(div);
//   });
});
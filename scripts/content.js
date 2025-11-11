// 监听页面上的点击事件
document.addEventListener('click', function(event) {
  // 获取点击元素的描述信息
  const target = event.target;
  const elementDescription = {
    tag: target.tagName,
    id: target.id,
    className: target.className,
    text: target.textContent?.trim().substring(0, 50), // 取前50个字符
    xpath: getXPath(target),
    cssSelector: getCSSSelector(target),
    timestamp: Date.now()
  };
  console.log("用户操作：", elementDescription);
  // 发送给background script
  chrome.runtime.sendMessage({
    type: 'USER_ACTION',
    data: elementDescription
  });
});

// 辅助函数：生成元素的XPath
function getXPath(element) {
  if (element.id !== '') {
    return '//*[@id="' + element.id + '"]';
  }
  if (element === document.body) {
    return '/html/body';
  }

  var ix = 0;
  var siblings = element.parentNode.childNodes;

  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// 辅助函数：生成元素的CSS选择器
function getCSSSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }
  if (element.className) {
    return '.' + element.className.trim().split(/\s+/).join('.');
  }
  return element.tagName;
}
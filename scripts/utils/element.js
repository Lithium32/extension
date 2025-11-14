export const elementUtils = {
    getElementInfo(element) {
        if (!element) return { tagName: 'unknown' };

        const info = {
            tagName: element.tagName?.toLowerCase(),
            id: element.id,
            className: element.className,
            name: element.name,
            type: element.type,
            placeholder: element.placeholder,
            text: element.textContent?.substring(0, 100).trim(),
            value: element.value,
            xpath: this.getXPath(element),
            cssSelector: this.getCssSelector(element)
        };

        // 获取更有意义的标识
        if (element.getAttribute('data-testid')) {
            info.testId = element.getAttribute('data-testid');
        }
        if (element.getAttribute('aria-label')) {
            info.ariaLabel = element.getAttribute('aria-label');
        }
        if (element.getAttribute('name')) {
            info.name = element.getAttribute('name');
        }

        return info;
    },

    getXPath(element) {
        if (!element) return '';
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const parts = [];
        let currentElement = element;
        
        while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = currentElement.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === currentElement.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = currentElement.tagName.toLowerCase();
            const part = index ? `${tagName}[${index + 1}]` : tagName;
            parts.unshift(part);
            
            currentElement = currentElement.parentNode;
        }
        
        return parts.length ? `/${parts.join('/')}` : '';
    }, 


    getCssSelector(element) {
        if (!element) return '';
        if (element.id) return `#${element.id}`;
        
        const path = [];
        let currentElement = element;
        
        while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
            let selector = currentElement.tagName.toLowerCase();
            
            if (currentElement.className) {
                const classes = currentElement.className.split(/\s+/).filter(Boolean);
                if (classes.length) {
                    selector += '.' + classes.join('.');
                }
            }
            
            path.unshift(selector);
            
            if (currentElement.parentNode) {
                currentElement = currentElement.parentNode;
            } else {
                break;
            }
        }
        
        return path.join(' > ');
    }
}

export default elementUtils;
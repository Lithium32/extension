export const storageUtils = {
   async saveToLocalStorage(key,value) {        
        await chrome.storage.local.set({ key: value });
    },

    async loadFromLocalStorage(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result;
        } catch (error) {
            console.error('Load storage error:', error);
        }
    }
};

export default storageUtils;

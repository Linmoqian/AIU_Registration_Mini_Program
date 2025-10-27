const app = getApp();

Page({
  data: {
    messages: [
      { role: 'assistant', content: '你好，我是超强螺旋升天惊天霹雳无敌agent，可以咨询报名、面试、部门介绍等问题。' }
    ],
    inputText: '',
    sending: false,
    loading: false,
    toView: ''
  },

  onShow() {},

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onTouchStart(e) { this.startX = e.changedTouches[0].clientX; },
  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - (this.startX || 0);
    if (Math.abs(delta) < 60) return;
    if (delta > 0) wx.switchTab({ url: '/pages/query/index' });
    else wx.switchTab({ url: '/pages/about/index' });
  },

  scrollToBottom() {
    this.setData({ toView: `msg-${this.data.messages.length - 1}` });
  },

  async send() {
    const text = this.data.inputText.trim();
    if (!text || this.data.sending) return;
    const newMessages = this.data.messages.concat([
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    const assistantIndex = newMessages.length - 1;
    this.setData({ messages: newMessages, inputText: '', sending: true, loading: false });
    this.scrollToBottom();

    try {
      const { apiBase, apiKey } = app.globalData.dify || {};
      if (!apiKey) {
        wx.showModal({ title: '未配置', content: '请在 app.js 设置 dify.apiKey，并在小程序后台配置合法请求域名。' });
        this.setData({ sending: false, loading: false });
        return;
      }
      // 计算正确的接口地址，兼容 apiBase 是否已包含 /v1
      let base = apiBase || 'https://api.dify.ai';
      if (base.endsWith('/')) base = base.slice(0, -1);
      const url = base.includes('/v1') ? `${base}/chat-messages` : `${base}/v1/chat-messages`;

      // 尝试使用分块流式
      let streamStarted = false;
      const requestTask = wx.request({
        url,
        method: 'POST',
        enableChunked: true,
        responseType: 'arraybuffer',
        timeout: 60000,
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream'
        },
        data: {
          inputs: {},
          query: text,
          user: 'miniapp-user',
          response_mode: 'streaming'
        },
        success: (res) => {
          // 如果未走流式（平台不支持），则一次性回包
          if (res && res.data && typeof res.data === 'object') {
            const answer = res.data.answer || res.data.output || '抱歉，我没有理解你的问题。';
            const msgs = this.data.messages;
            msgs[assistantIndex].content = answer;
            this.setData({ messages: msgs });
          }
        },
        fail: () => {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        },
        complete: () => {
          this.setData({ sending: false, loading: false });
          this.scrollToBottom();
        }
      });

      // 解析 SSE 分块
      if (requestTask && requestTask.onChunkReceived) {
        let bufferStr = '';
        const appendText = (delta) => {
          if (!delta) return;
          if (!streamStarted) {
            streamStarted = true;
          }
          const msgs = this.data.messages;
          msgs[assistantIndex].content += delta;
          this.setData({ messages: msgs });
          this.scrollToBottom();
        };
        const ab2str = (ab) => {
          try {
            if (typeof TextDecoder !== 'undefined') {
              return new TextDecoder('utf-8').decode(ab);
            }
          } catch (e) {}
          const view = new Uint8Array(ab);
          let str = '';
          for (let i = 0; i < view.length; i += 1024) {
            const sub = view.slice(i, i + 1024);
            str += String.fromCharCode.apply(null, sub);
          }
          try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
        };
        requestTask.onChunkReceived((res) => {
          try {
            let chunk = ab2str(res.data);
            bufferStr += chunk;
            const parts = bufferStr.split('\n\n');
            // 保留最后一个不完整分段在 bufferStr 中
            bufferStr = parts.pop();
            for (const part of parts) {
              const lines = part.split('\n');
              for (const line of lines) {
                const l = line.trim();
                if (!l.startsWith('data:')) continue;
                const payload = l.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                try {
                  const obj = JSON.parse(payload);
                  const delta = obj.answer || obj.output || obj.data?.answer || obj.segment || obj.text || '';
                  appendText(delta);
                } catch (e) {
                  // 非 JSON 数据，直接附加
                  appendText(payload);
                }
              }
            }
          } catch (e) {}
        });
        if (requestTask.onHeadersReceived) {
          requestTask.onHeadersReceived((h) => {
            const ct = (h && (h['content-type'] || h['Content-Type'])) || '';
            if ((ct + '').indexOf('text/event-stream') >= 0) {
              // 预判会走流式
              this.setData({ loading: true });
            }
          });
        }
      }
    } catch (e) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      this.setData({ sending: false, loading: false });
    }
  }
});

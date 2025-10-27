Page({
  data: {
    tapCount: 0,
    lastTapTs: 0,
  },

  // 点击会标（8 次进入管理员登录）
  toggleChat() {
    const now = Date.now();
    const delta = now - this.data.lastTapTs;
    if (delta > 1500) {
      // 超过窗口期，重新计数
      this.setData({ tapCount: 1, lastTapTs: now });
      return;
    }
    const n = (this.data.tapCount || 0) + 1;
    this.setData({ tapCount: n, lastTapTs: now });
    if (n >= 8) {
      this.setData({ tapCount: 0 });
      wx.navigateTo({ url: "/pages/admin/login" });
    }
  },

  // 点击会标触发彩蛋计数
  onTapBadge() { this.toggleChat(); },

  // 公众号二维码改为常显，移除 openMp

  previewQr() {
    const url = '../../images/公众号二维码.jpg'.replace('/miniprogram','');
    wx.previewImage({ urls: [url] });
  },

  openSite() {
    wx.setClipboardData({ data: "http://www.scauaiu.xyz", success: () => wx.showToast({ title: "链接已复制" }) });
  },

  onShareAppMessage() {
    return {
      title: 'AIU 协会',
      path: '/pages/about/index'
    };
  },

  onTouchStart(e) { this.startX = e.changedTouches[0].clientX; },
  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - (this.startX || 0);
    if (Math.abs(delta) < 60) return;
    if (delta < 0) wx.switchTab({ url: '/pages/apply/index' });
    else wx.switchTab({ url: '/pages/chat/index' });
  }
});

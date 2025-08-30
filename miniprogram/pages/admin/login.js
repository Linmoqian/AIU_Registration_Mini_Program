Page({
  data: { pwd: '' },
  onInput(e) { this.setData({ pwd: e.detail.value }); },
  onSubmit() {
    if (this.data.pwd === '1433223') {
      wx.navigateTo({ url: '/pages/admin/index' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
    }
  }
});


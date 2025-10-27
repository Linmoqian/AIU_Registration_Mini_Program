Page({
  data: { pwd: '' },
  onInput(e) { this.setData({ pwd: e.detail.value }); },
  onSubmit() {
    if (this.data.pwd === '1433223') {
      wx.navigateTo({ url: '/pages/admin/index' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
    }
  },
  getCode() {
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getMiniProgramCode' } // 已内置 page=pages/about/index, check_path=false
    }).then(({ result }) => {
      const fileID = result;          // 云文件ID
      this.setData({ codeFileId: fileID }); // 方式A：直接在 <image> 显示
  
      // 方式B：转临时链接后预览/保存
      return wx.cloud.getTempFileURL({ fileList: [fileID] });
    }).then(({ fileList }) => {
      const url = fileList[0].tempFileURL;
      wx.previewImage({ urls: [url] });
    }).catch(() => {
      wx.showToast({ title: '获取失败', icon: 'none' });
    });
  }
});


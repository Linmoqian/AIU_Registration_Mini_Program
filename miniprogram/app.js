// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: "cloud1-2g8fmz4264601283",
      // Dify 客户端直连配置（请替换为你的值，并在小程序后台配置合法域名）
      dify: {
        apiBase: "https://api.dify.ai",
        apiKey: "app-gxUsHtBUEczV9jMPNC7YfAr2", // 客户端 Key（公开访问的 Key）
      }
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },
});

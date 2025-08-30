const STATUS_ORDER = ["unregistered", "interview", "result"]; // 未报名、面试、录取结果

Page({
  data: {
    stepList: ["未报名", "面试", "录取结果"],
    status: "unregistered",
    statusOrderIndex: 0,
    resultText: "正在查询...",
  },

  async onShow() {
    await this.queryMyStatus();
  },

  async queryMyStatus() {
    try {
      const openidRes = await wx.cloud.callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } });
      const openid = openidRes?.result?.openid || "";
      const db = wx.cloud.database();
      // 优先读管理员决策 admissions，其次回退到 signup
      const adm = await db.collection('admissions').where({ openid }).orderBy('updatedAt', 'desc').limit(1).get();
      let status = "unregistered";
      let text = "您还未报名，请返回首页先完成报名。";
      if (adm.data && adm.data.length) {
        const a = adm.data[0];
        const s = a.status || "admitted";
        status = s === 'admitted' || s === 'rejected' ? 'result' : s;
        const dept = a.department || "协会";
        if (s === 'admitted') text = `你已被${dept}录取`;
        else if (s === 'rejected') text = `很遗憾，本轮未录取。如有疑问请联系组织者。`;
        else text = `报名已提交，请留意面试通知。`;
        this.setData({ status, statusOrderIndex: STATUS_ORDER.indexOf(status), resultText: text });
        return;
      }
      const { data } = await db.collection("signup").where({ openid }).orderBy("createdAt", "desc").limit(1).get();
      if (data && data.length) {
        const s = data[0].status || "interview";
        status = s === 'admitted' || s === 'rejected' ? 'result' : s;
        if (s === 'admitted') {
          const dept = data[0].firstChoice || "协会";
          text = `你已被${dept}录取`;
        } else if (s === 'rejected') {
          text = `很遗憾，本轮未录取。如有疑问请联系组织者。`;
        } else {
          text = "报名已提交，请留意面试通知。";
        }
      }
      this.setData({ status, statusOrderIndex: STATUS_ORDER.indexOf(status), resultText: text });
    } catch (e) {
      this.setData({ resultText: "查询失败，请稍后重试" });
    }
  },
});

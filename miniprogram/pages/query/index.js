const STATUS_ORDER = ["unregistered", "interview", "result"]; // 未报名、面试、录取结果

Page({
  data: {
    stepList: ["未报名", "面试", "录取结果"],
    status: "unregistered",
    statusOrderIndex: 0,
    resultText: "正在查询...",
    resultParagraphs: [],
  },

  async onShow() {
    await this.queryMyStatus();
  },

  onTouchStart(e) {
    this.startX = e.changedTouches[0].clientX;
  },

  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - (this.startX || 0);
    if (Math.abs(delta) < 60) return;
    if (delta > 0) {
      // 右滑：去聊天页
      wx.switchTab({ url: '/pages/apply/index' });
    } else {
      // 左滑：去报名页
      wx.switchTab({ url: '/pages/chat/index' });
    }
  },

  async queryMyStatus() {
    try {
      const openidRes = await wx.cloud.callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } });
      const openid = openidRes?.result?.openid || "";
      const db = wx.cloud.database();
      // 优先读管理员决策 admissions，其次回退到 signup
      const adm = await db.collection('admissions').where({ openid }).orderBy('updatedAt', 'desc').limit(1).get();
      let status = "unregistered";
      let text = "您还未报名，请先完成报名。";
      let paragraphs = [];
      if (adm.data && adm.data.length) {
        const a = adm.data[0];
        const s = a.status || "admitted";
        status = s === 'admitted' || s === 'rejected' ? 'result' : s;
        const dept = a.department || "协会";
        if (s === 'admitted') text = `亲爱的同学：

恭喜你！经过综合考察与慎重评估，我们很高兴地通知你，已成功录取到 [${dept}]。🎉

你的热情、才华与潜力打动了我们，相信你一定能在接下来的学习与实践中发光发热。未来的道路上，可能会有挑战，也一定充满收获。我们将与你携手同行，一起成长！

请关注后续的通知，保持联系方式畅通。欢迎加入这个大家庭！`;
        else if (s === 'rejected') text = `亲爱的同学：

真的很感谢你对 [协会] 的信任和热情！这次的竞争异常激烈，遗憾的是，你未能进入最终录取名单。😢

但请相信，这绝不意味着你的价值被否定。相反，你的勇气、努力和热情都值得我们点赞！👏  
可能这次缘分没到，但未来的道路上，还有很多机会等着你。我们期待在别的舞台上再次遇见更闪耀的你！✨

加油，世界很大，你一定能找到属于你的舞台！💫`;
        else text = `报名已提交，请留意面试通知。`;
        paragraphs = text.split(/\n\s*\n/);
        this.setData({ status, statusOrderIndex: STATUS_ORDER.indexOf(status), resultText: text, resultParagraphs: paragraphs });
        return;
      }
      const { data } = await db.collection("signup").where({ openid }).orderBy("createdAt", "desc").limit(1).get();
      if (data && data.length) {
        const s = data[0].status || "interview";
        status = s === 'admitted' || s === 'rejected' ? 'result' : s;
        if (s === 'admitted') {
          const dept = data[0].admittedDept || data[0].firstChoice || "协会";
          text = `亲爱的同学：

恭喜你！经过综合考察与慎重评估，我们很高兴地通知你，已成功录取到 [${dept}]。🎉

你的热情、才华与潜力打动了我们，相信你一定能在接下来的学习与实践中发光发热。未来的道路上，可能会有挑战，也一定充满收获。我们将与你携手同行，一起成长！

请关注后续的通知，保持联系方式畅通。欢迎加入这个大家庭！`;
        } else if (s === 'rejected') {
          text = `亲爱的同学：

真的很感谢你对 [协会] 的信任和热情！这次的竞争异常激烈，遗憾的是，你未能进入最终录取名单。😢

但请相信，这绝不意味着你的价值被否定。相反，你的勇气、努力和热情都值得我们点赞！👏  
可能这次缘分没到，但未来的道路上，还有很多机会等着你。我们期待在别的舞台上再次遇见更闪耀的你！✨

加油，世界很大，你一定能找到属于你的舞台！💫`;
        } else {
          text = "报名已提交，请留意面试通知。";
        }
      }
      paragraphs = text.split(/\n\s*\n/);
      this.setData({ status, statusOrderIndex: STATUS_ORDER.indexOf(status), resultText: text, resultParagraphs: paragraphs });
    } catch (e) {
      this.setData({ resultText: "查询失败，请稍后重试" });
    }
  },
});

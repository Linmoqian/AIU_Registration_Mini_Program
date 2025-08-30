Page({
  data: {
    keyword: '',
    items: [],
    deptOptions: ['运营部','外联部','创智部','宣传部']
  },

  onKey(e) { this.setData({ keyword: e.detail.value }); },

  async query() {
    const db = wx.cloud.database();
    const kw = (this.data.keyword || '').trim();
    let _ = db.command;
    let where = {};
    if (kw) {
      where = _.or([
        { name: db.RegExp({ regexp: kw, options: 'i' }) },
        { mobile: db.RegExp({ regexp: kw, options: 'i' }) }
      ]);
    }
    const { data } = await db.collection('signup').where(where).orderBy('createdAt','desc').limit(50).get();
    const items = data.map(d => ({ ...d, deptIndex: Math.max(0, this.data.deptOptions.indexOf(d.firstChoice||'')) }));
    this.setData({ items });
  },

  onPickDept(e) {
    const id = e.currentTarget.dataset.id;
    const idx = Number(e.detail.value);
    const items = this.data.items.map(it => it._id===id ? { ...it, deptIndex: idx, department: this.data.deptOptions[idx] } : it);
    this.setData({ items });
  },

  async admit(e) { await this.updateAdmission(e.currentTarget.dataset.id, 'admitted'); },
  async reject(e) { await this.updateAdmission(e.currentTarget.dataset.id, 'rejected'); },

  async updateAdmission(id, status) {
    const item = this.data.items.find(i => i._id===id);
    if (!item) return;
    const department = item.department || this.data.deptOptions[item.deptIndex||0];
    try {
      wx.showLoading({ title: '提交中' });
      await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'adminUpsertAdmission',
          openid: item.openid,
          name: item.name,
          mobile: item.mobile,
          status,
          department
        }
      });
      // 同步更新报名集合，保证查询页（回退读取 signup）也能看到最新状态
      const db = wx.cloud.database();
      try {
        await db.collection('signup').where({ openid: item.openid }).update({
          data: { status, admittedDept: department, updatedAt: db.serverDate() }
        });
      } catch (e) {}
      wx.hideLoading();
      wx.showToast({ title: '已更新' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '失败', icon: 'none' });
    }
  }
});


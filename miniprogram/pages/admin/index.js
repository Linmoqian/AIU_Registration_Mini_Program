Page({
  data: {
    keyword: '',
    items: [],
    deptOptions: ['运营部','外联部','创智部','宣传部'],
    // 筛选
    filterDeptOptions: ['全部志愿','运营部','外联部','创智部','宣传部'],
    filterDeptIndex: 0,
    statusOptions: ['全部状态','interview','admitted','rejected'],
    filterStatusIndex: 0
  },

  async onShow() {
    // 进入页面自动加载最新报名概览
    await this.query();
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
    // 组合筛选：志愿与状态
    const filters = [];
    if (this.data.filterDeptIndex > 0) {
      const dept = this.data.filterDeptOptions[this.data.filterDeptIndex];
      filters.push(_.or([{ firstChoice: dept }, { secondChoice: dept }]));
    }
    if (this.data.filterStatusIndex > 0) {
      const status = this.data.statusOptions[this.data.filterStatusIndex];
      filters.push({ status });
    }
    let finalWhere = where;
    if (filters.length) {
      finalWhere = where && Object.keys(where).length ? _.and([where, ...filters]) : (filters.length===1 ? filters[0] : _.and(filters));
    }

    const { data } = await db.collection('signup').where(finalWhere).orderBy('createdAt','desc').limit(50).get();
    const items = data.map(d => ({ ...d, deptIndex: Math.max(0, this.data.deptOptions.indexOf(d.firstChoice||'')) }));
    this.setData({ items });
  },

  onPullDownRefresh() {
    this.query().finally(() => wx.stopPullDownRefresh());
  },

  onTouchStart(e) { this.startX = e.changedTouches[0].clientX; },
  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - (this.startX || 0);
    if (Math.abs(delta) < 60) return;
    if (delta > 0) wx.switchTab({ url: '/pages/query/index' });
    else wx.switchTab({ url: '/pages/chat/index' });
  },

  onPickDept(e) {
    const id = e.currentTarget.dataset.id;
    const idx = Number(e.detail.value);
    const items = this.data.items.map(it => it._id===id ? { ...it, deptIndex: idx, department: this.data.deptOptions[idx] } : it);
    this.setData({ items });
  },

  stopTap() {},

  onFilterDept(e){ this.setData({ filterDeptIndex: Number(e.detail.value) }); },
  onFilterStatus(e){ this.setData({ filterStatusIndex: Number(e.detail.value) }); },

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
  ,
  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/detail?id=${id}` });
  }
});


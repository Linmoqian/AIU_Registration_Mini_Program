Page({
  data: { id: '', doc: {} },
  async onLoad(q) {
    this.setData({ id: q.id || '' });
    if (!q.id) return;
    const db = wx.cloud.database();
    try {
      const { data } = await db.collection('signup').doc(q.id).get().catch(()=>({data:null}));
      if (data) { this.setData({ doc: data }); return; }
      // 若不是用 _id=openid 方案，则回退尝试 where
      const res = await db.collection('signup').where({ _id: q.id }).limit(1).get();
      if (res.data && res.data.length) this.setData({ doc: res.data[0] });
    } catch (e) {}
  }
  ,
  previewAvatar(){
    const url = this.data.doc.avatarUrl;
    if (!url) return;
    wx.previewImage({ urls: [url] });
  }
});


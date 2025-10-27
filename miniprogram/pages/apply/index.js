Page({
  data: {
    defaultAvatar: "/miniprogram/images/avatar.png".replace("/miniprogram", ""),
    submitting: false,
    genderOptions: ["男", "女"],
    genderIndex: 0,
    deptOptions: ["运营部", "外联部", "创智部", "宣传部"],
    deptIndex1: 0,
    deptIndex2: 0,
    today: "",
    form: {
      avatarUrl: "",
      name: "",
      mobile: "",
      wechat: "",
      birth: "",
      gender: "",
      political: "",
      college: "",
      grade: "",
      majorClass: "",
      firstChoice: "",
      firstChoiceCode: "",
      secondChoice: "",
      secondChoiceCode: "",
      adjustable: true,
      intro: "",
      other: "",
    },
  },
  onTouchStart(e) { this.startX = e.changedTouches[0].clientX; },
  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - (this.startX || 0);
    if (Math.abs(delta) < 60) return;
    if (delta < 0) wx.switchTab({ url: '/pages/query/index' });
    else wx.switchTab({ url: '/pages/about/index' });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value }, this.saveDraft);
  },

  onPickDate(e) {
    this.setData({ "form.birth": e.detail.value }, this.saveDraft);
  },

  onLoad() {
    // 默认 18 岁：今天往前推 18 年
    const now = new Date();
    const y = now.getFullYear() - 18;
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const defaultBirth = `${y}-${m}-${d}`;
    const today = `${now.getFullYear()}-${m}-${d}`;
    // 恢复本地草稿
    try {
      const draft = wx.getStorageSync('applyFormDraft') || null;
      if (draft && typeof draft === 'object') {
        const genderIndex = this.data.genderOptions.indexOf(draft.gender || '');
        this.setData({ form: { ...this.data.form, ...draft }, genderIndex: genderIndex >= 0 ? genderIndex : this.data.genderIndex });
      }
    } catch (e) {}
    if (!this.data.form.birth) {
      this.setData({ "form.birth": defaultBirth });
    }
    this.setData({ today });
  },

  onPickGender(e) {
    const index = Number(e.detail.value);
    this.setData({ genderIndex: index, "form.gender": this.data.genderOptions[index] }, this.saveDraft);
  },

  onRadioGenderChange(e) {
    const value = e.detail.value;
    const index = this.data.genderOptions.indexOf(value);
    this.setData({ "form.gender": value, genderIndex: index >= 0 ? index : 0 }, this.saveDraft);
  },

  onPickDept1(e) {
    const index = Number(e.detail.value);
    this.setData({ deptIndex1: index, "form.firstChoice": this.data.deptOptions[index], "form.firstChoiceCode": String(index) }, this.saveDraft);
  },

  onPickDept2(e) {
    const index = Number(e.detail.value);
    this.setData({ deptIndex2: index, "form.secondChoice": this.data.deptOptions[index], "form.secondChoiceCode": String(index) }, this.saveDraft);
  },

  normalizeForm(raw) {
    const t = (s) => (typeof s === 'string' ? s.trim() : s);
    return {
      ...raw,
      name: t(raw.name),
      mobile: t(raw.mobile),
      wechat: t(raw.wechat),
      birth: t(raw.birth),
      gender: t(raw.gender),
      political: t(raw.political),
      college: t(raw.college),
      grade: t(raw.grade),
      majorClass: t(raw.majorClass),
      firstChoice: t(raw.firstChoice),
      secondChoice: t(raw.secondChoice),
      intro: t(raw.intro),
      other: t(raw.other),
    };
  },

  onToggleAdjust(e) {
    this.setData({ "form.adjustable": e.detail.value }, this.saveDraft);
  },

  async chooseAvatar() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ["image"], sizeType: ["compressed"], sourceType: ["album", "camera"] });
      const tempPath = res.tempFiles[0].tempFilePath;
      wx.showLoading({ title: "上传中" });
      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random()*10000)}.png`;
      const upload = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath });
      this.setData({ "form.avatarUrl": upload.fileID }, this.saveDraft);
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
    }
  },

  saveDraft() {
    try {
      wx.setStorageSync('applyFormDraft', this.data.form);
    } catch (e) {}
  },

  validate() {
    const f = this.data.form;
    if (!f.name) return "请填写姓名";
    if (!/^1\d{10}$/.test(f.mobile)) return "请填写有效手机号";
    if (!f.birth) return "请选择出生日期";
    if (!f.gender) return "请选择性别";
    if (!f.college) return "请填写学院";
    if (!f.grade) return "请填写年级";
    if (!f.firstChoice) return "请填写第一志愿";
    return "";
  },

  async ensureCollection() {
    try {
      await wx.cloud.callFunction({ name: "quickstartFunctions", data: { type: "createApplications" } });
    } catch (e) {}
  },

  async onSubmit() {
    const err = this.validate();
    if (err) {
      wx.showToast({ title: err, icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      // 获取 openid 以便后续查询
      const openidRes = await wx.cloud.callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } });
      const openid = openidRes?.result?.openid || "";

      const upsert = async () => {
        const dataToSave = this.normalizeForm(this.data.form);
        const r = await wx.cloud.callFunction({
          name: "quickstartFunctions",
          data: { type: "signupSubmit", data: dataToSave }
        });
        if (!r || !r.result || r.result.success !== true) {
          throw (r && r.result && r.result.errMsg) || "提交失败";
        }
      }

      try {
        await upsert();
      } catch (err) {
        throw err;
      }

      wx.showToast({ title: "提交成功" });
      try { wx.removeStorageSync('applyFormDraft'); } catch (e) {}
      setTimeout(() => {
        wx.navigateBack({});
      }, 800);
    } catch (e) {
      const content = e?.errMsg || (typeof e === 'string' ? e : '请稍后重试');
      wx.showModal({ title: "提交失败", content });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

const cloud = require("wx-server-sdk");
const fetch = require("node-fetch");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/about/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 创建报名集合（统一为 signup）
const createApplicationsCollection = async () => {
  try {
    await db.createCollection("signup");
    return { success: true };
  } catch (e) {
    // 已存在也当成功
    return { success: true };
  }
};

// 创建管理员决策集合 admissions
const createAdmissionsCollection = async () => {
  try { await db.createCollection('admissions'); return { success: true }; } catch (e) { return { success: true }; }
};

// 业务：报名提交与查询
const DEPT_OPTIONS = ["运营部", "外联部", "创智部", "宣传部"];
const GENDER_OPTIONS = ["男", "女"];

const signupSubmit = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const form = (event && event.data) || {};
  if (!form.name || !/^1\d{10}$/.test(form.mobile || '')) {
    return { success: false, errMsg: '参数不合法' };
  }
  if (form.gender && !GENDER_OPTIONS.includes(form.gender)) return { success: false, errMsg: '性别不合法' };
  if (form.firstChoice && !DEPT_OPTIONS.includes(form.firstChoice)) return { success: false, errMsg: '第一志愿不合法' };
  if (form.secondChoice && !DEPT_OPTIONS.includes(form.secondChoice)) return { success: false, errMsg: '第二志愿不合法' };

  const col = db.collection('signup');
  const writeOnce = async () => {
    const exist = await col.where({ openid: OPENID }).get();
    if (exist.data && exist.data.length) {
      await col.doc(exist.data[0]._id).update({ data: { ...form, updatedAt: db.serverDate() } });
    } else {
      await col.add({ data: { ...form, openid: OPENID, status: 'interview', createdAt: db.serverDate(), updatedAt: db.serverDate() } });
    }
  };
  try {
    await writeOnce();
  } catch (e) {
    const msg = e?.errMsg || '';
    if (msg.includes('DATABASE_COLLECTION_NOT_EXIST')) {
      await createApplicationsCollection();
      await writeOnce();
    } else {
      return { success: false, errMsg: msg || '写入失败' };
    }
  }
  return { success: true };
};

const signupGetStatus = async () => {
  const { OPENID } = cloud.getWXContext();
  try {
    const { data } = await db.collection('signup').where({ openid: OPENID }).orderBy('createdAt', 'desc').limit(1).get();
    if (!data || !data.length) return { success: true, data: null };
    const d = data[0];
    return { success: true, data: { status: d.status || 'interview', firstChoice: d.firstChoice || '' } };
  } catch (e) {
    return { success: false, errMsg: e.errMsg || '查询失败' };
  }
};

// 管理员写入/更新录取决策（集合 admissions）
// 授权方式：环境变量 ADMIN_OPENIDS（逗号分隔）或 ADMIN_TOKEN
const adminUpsertAdmission = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const token = (event && event.token) || '';
  const adminOpenids = (process.env.ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const adminToken = process.env.ADMIN_TOKEN || '';
  if (!(adminOpenids.includes(OPENID) || (adminToken && token === adminToken))) {
    return { success: false, errMsg: '无权限' };
  }
  const { openid, name, mobile, status, department } = event || {};
  if (!openid && !mobile) return { success: false, errMsg: '缺少 openid 或 mobile' };
  const validStatus = ['interview','admitted','rejected'];
  if (status && !validStatus.includes(status)) return { success: false, errMsg: '状态不合法' };
  if (department && !DEPT_OPTIONS.includes(department)) return { success: false, errMsg: '部门不合法' };

  const col = db.collection('admissions');
  const where = openid ? { openid } : { mobile };
  try {
    const { data } = await col.where(where).limit(1).get();
    if (data && data.length) {
      await col.doc(data[0]._id).update({ data: { openid, name, mobile, status, department, updatedAt: db.serverDate() } });
    } else {
      try { await createAdmissionsCollection(); } catch (e) {}
      await col.add({ data: { openid, name, mobile, status, department, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
    }
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.errMsg || '写入失败' };
  }
};

// 调用 Dify 聊天机器人
// 需要在环境变量中配置 DIFY_API_BASE、DIFY_API_KEY、DIFY_APP_ID
const difyChat = async (event) => {
  const { messages } = event;
  const apiBase = process.env.DIFY_API_BASE || "https://api.dify.ai";
  const apiKey = process.env.DIFY_API_KEY;
  const appId = process.env.DIFY_APP_ID;
  if (!apiKey || !appId) {
    return { success: false, errMsg: "未配置Dify环境变量" };
  }
  try {
    const resp = await fetch(`${apiBase}/v1/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-KEY": apiKey,
        "X-APP-ID": appId,
      },
      body: JSON.stringify({
        inputs: {},
        query: messages && messages.length ? messages[messages.length - 1].content : "",
        user: "miniapp_user",
        response_mode: "blocking",
      }),
    });
    const data = await resp.json();
    return { success: true, data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const sumRecord = require('./sumRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');
// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "createApplications":
      return await createApplicationsCollection();
    case "difyChat":
      return await difyChat(event);
    case "signupSubmit":
      return await signupSubmit(event);
    case "signupGetStatus":
      return await signupGetStatus(event);
    case "adminUpsertAdmission":
      return await adminUpsertAdmission(event);
  }
};

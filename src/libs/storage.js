import {
  APP_NAME,
  STOKEY_SETTING,
  STOKEY_SETTING_BACKUP_V1_BEFORE_V2,
  STOKEY_RULES,
  STOKEY_FAB,
  STOKEY_TRANBOX,
  STOKEY_MSAUTH,
  DEFAULT_SETTING,
  DEFAULT_RULES,
  DEFAULT_API_LIST,
  OPT_STYLE_NONE,
  getSettingVersion,
} from "../config";
import {
  CURRENT_SETTINGS_VERSION,
  runSettingMigrations,
} from "../core/storage/migrations";
import { isExt } from "./client";
import { browser } from "./browser";
import { appLog } from "./log";
import { debounce } from "./utils";
import { normalizeSetting } from "../core/storage/schema";

// 品牌更名前的应用名，用于一次性迁移旧 chrome.storage/localStorage 数据。
const LEGACY_APP_NAME = "KISS-Translator";

/**
 * 跨平台存储底层写入操作。
 * 自动适配 Chrome Extension (browser.storage.local) 与普通网页环境 (localStorage)。
 * @param {string} key 键名
 * @param {*} val 待写入的字符串数据
 */
async function set(key, val) {
  if (isExt && browser?.storage?.local) {
    await browser.storage.local.set({ [key]: val });
  } else {
    window.localStorage.setItem(key, val);
  }
}

/**
 * 跨平台存储底层读取操作。
 * @param {string} key 键名
 * @returns {Promise<string|null>} 读取到的原始字符串数据
 */
async function get(key) {
  if (isExt && browser?.storage?.local) {
    const val = await browser.storage.local.get([key]);
    return val[key];
  }
  return window.localStorage.getItem(key);
}

/**
 * 跨平台存储底层删除操作。
 * @param {string} key 键名
 */
async function del(key) {
  if (isExt && browser?.storage?.local) {
    await browser.storage.local.remove([key]);
  } else {
    window.localStorage.removeItem(key);
  }
}

/**
 * 写入序列化后的对象数据。
 * @param {string} key 键名
 * @param {Object|Array} obj 待存入 of JS 对象或数组
 */
async function setObj(key, obj) {
  await set(key, JSON.stringify(obj));
}

/**
 * 尝试写入默认对象数据。仅在当前键名不存在任何值时才会触发写入。
 * @param {string} key 键名
 * @param {Object|Array} obj 默认值对象
 */
async function trySetObj(key, obj) {
  if (!(await get(key))) {
    await setObj(key, obj);
  }
}

/**
 * 读取并自动反序列化 JSON 字符串为 JS 对象。
 * @param {string} key 键名
 * @returns {Promise<Object|Array|null>} 返回反序列化后的数据，发生解析错误或为空时返回 null
 */
async function getObj(key) {
  const val = await get(key);
  if (val === null || val === undefined) return null;
  try {
    return JSON.parse(val);
  } catch (err) {
    appLog("parse json in storage err: ", key);
  }
  return null;
}

/**
 * 局部合并并更新已存的对象数据。
 * REVIEW: 该方法采用 ES6 属性展开符进行浅拷贝合并。若原对象含有较深的嵌套子结构，
 * 在调用此方法更新子结构时需要调用者自行处理好深度合并，否则会导致深层字段丢失。
 * @param {string} key 键名
 * @param {Object} obj 待合并的数据切片
 */
async function putObj(key, obj) {
  const cur = (await getObj(key)) ?? {};
  await setObj(key, { ...cur, ...obj });
}

/**
 * 对外暴露的底层通用 storage 接口封装
 */
export const storage = {
  get,
  set,
  del,
  setObj,
  trySetObj,
  getObj,
  putObj,
};

// --- 应用设置 (Settings) 数据存取 ---
export const getSetting = () => getObj(STOKEY_SETTING);
const writeSettingBackupBeforeV2 = (setting) =>
  setObj(STOKEY_SETTING_BACKUP_V1_BEFORE_V2, setting);
// 读取时补齐缺失的内置 API，尊重用户显式删除的记录，避免依赖 React effect 自愈。
const mergeBuiltinApis = (setting) => {
  const transApis = Array.isArray(setting.transApis) ? setting.transApis : [];
  const deletedSlugs = new Set(setting.deletedTransApiSlugs || []);
  const curSlugs = new Set(
    transApis.map((api) => api && api.apiSlug).filter(Boolean)
  );
  const missingApis = DEFAULT_API_LIST.filter(
    (api) => !curSlugs.has(api.apiSlug) && !deletedSlugs.has(api.apiSlug)
  );
  if (missingApis.length === 0) return setting;
  return { ...setting, transApis: [...transApis, ...missingApis] };
};
const mergeSettingWithDefault = (setting) =>
  mergeBuiltinApis({
    ...DEFAULT_SETTING,
    ...normalizeSetting(setting || {}),
    version: setting?.version ?? DEFAULT_SETTING.version,
  });
const migrateStoredSetting = async (setting, backupSetting = setting) => {
  if (getSettingVersion(setting) >= CURRENT_SETTINGS_VERSION) {
    return setting;
  }

  await writeSettingBackupBeforeV2(backupSetting);
  return runSettingMigrations(setting);
};

const migrateLegacyAppStorage = async () => {
  const keys = [
    STOKEY_SETTING,
    STOKEY_SETTING_BACKUP_V1_BEFORE_V2,
    STOKEY_RULES,
    STOKEY_FAB,
    STOKEY_TRANBOX,
    STOKEY_MSAUTH,
  ];

  for (const key of keys) {
    const legacyKey = key.replace(APP_NAME, LEGACY_APP_NAME);
    if (legacyKey === key) continue;

    const value = await get(legacyKey);
    if (value !== undefined && value !== null && !(await get(key))) {
      await set(key, value);
    }
  }
};

export const runDataMigration = async () => {
  await migrateLegacyAppStorage();

  const rawSetting = await getSetting();
  if (rawSetting && getSettingVersion(rawSetting) < CURRENT_SETTINGS_VERSION) {
    try {
      const nextSetting = await migrateStoredSetting(rawSetting, rawSetting);
      await setObj(STOKEY_SETTING, nextSetting);
      appLog("Settings migration completed.");
    } catch (err) {
      appLog("Data migration failed:", err);
    }
  }
};

export const getSettingWithDefault = async () => {
  const rawSetting = await getSetting();
  if (!rawSetting) {
    return DEFAULT_SETTING;
  }

  const setting =
    getSettingVersion(rawSetting) < CURRENT_SETTINGS_VERSION
      ? runSettingMigrations(rawSetting)
      : rawSetting;

  return mergeSettingWithDefault(setting);
};
export const setSetting = async (val) => setObj(STOKEY_SETTING, val);

// --- 用户翻译规则 (Rules) 数据存取 ---
const getRules = () => getObj(STOKEY_RULES);
// 已被移除的内置译文样式：旧配置读到这些值时自动回退为无样式。
const LEGACY_REMOVED_TEXT_STYLES = new Set([
  "fuzzy",
  "blink",
  "marker",
  "gradient_marker",
]);
export const getRulesWithDefault = async () => {
  const rules = (await getRules()) || DEFAULT_RULES;
  if (!Array.isArray(rules)) return DEFAULT_RULES;
  return rules.map((rule) =>
    rule && LEGACY_REMOVED_TEXT_STYLES.has(rule.textStyle)
      ? { ...rule, textStyle: OPT_STYLE_NONE }
      : rule
  );
};
export const setRules = (val) => setObj(STOKEY_RULES, val);

// --- 悬浮球 (Fab Button) 位置及偏好存取 ---
const getFab = () => getObj(STOKEY_FAB);
export const getFabWithDefault = async () => (await getFab()) || {};
export const putFab = (obj) => putObj(STOKEY_FAB, obj);

// --- 交互翻译框 (TranBox UI) 位置与大小存取 ---
export const getTranBox = () => getObj(STOKEY_TRANBOX);
const putTranBox = (obj) => putObj(STOKEY_TRANBOX, obj);
// 节流处理高频更新的 TranBox 位置写入
export const debouncePutTranBox = debounce(putTranBox, 300);

// --- 微软云服务授权 Token 存取 ---
export const getMsauth = () => getObj(STOKEY_MSAUTH);
export const setMsauth = (val) => setObj(STOKEY_MSAUTH, val);

/**
 * 首次加载或升级时，尝试向本地写入系统默认初始数据。
 * @param {string} uiLang 系统的默认语言设置
 */
export const tryInitDefaultData = async (uiLang) => {
  try {
    await trySetObj(STOKEY_SETTING, { ...DEFAULT_SETTING, uiLang });
    await trySetObj(STOKEY_RULES, DEFAULT_RULES);
  } catch (err) {
    appLog("init default", err);
  }
};

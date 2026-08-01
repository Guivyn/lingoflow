// CRA 构建要求入口文件存在；扩展构建使用 config-overrides 覆盖为 options/popup/content 入口。
// 该文件不会被扩展打包引用，仅用于满足 react-scripts 的路径校验。
console.log("LingoFlow Chrome extension build entry.");

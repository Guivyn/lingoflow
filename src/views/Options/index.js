import { Routes, Route, HashRouter } from "react-router-dom";
import Rules from "./Rules";
import Setting from "./Setting";
import Layout from "./Layout";
import { SettingProvider } from "../../hooks/Setting";
import ThemeProvider from "../../hooks/Theme";
import { AlertProvider } from "../../hooks/Alert";
import { ConfirmProvider } from "../../hooks/Confirm";
import Apis from "./Apis";
import Tranbox from "./Tranbox";
import MouseHoverSetting from "./MouseHover";
import SubtitleSetting from "./Subtitle";
import StylesSetting from "./StylesSetting";

/**
 * 选项设置中心 (Options) 根入口组件
 */
export default function Options() {
  return (
    <SettingProvider context="options">
      <ThemeProvider>
        <AlertProvider>
          <ConfirmProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Setting />} />
                  <Route path="rules" element={<Rules />} />
                  <Route path="styles" element={<StylesSetting />} />
                  <Route path="tranbox" element={<Tranbox />} />
                  <Route path="mousehover" element={<MouseHoverSetting />} />
                  <Route path="subtitle" element={<SubtitleSetting />} />
                  <Route path="apis" element={<Apis />} />
                </Route>
              </Routes>
            </HashRouter>
          </ConfirmProvider>
        </AlertProvider>
      </ThemeProvider>
    </SettingProvider>
  );
}

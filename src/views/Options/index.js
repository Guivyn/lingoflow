import { Routes, Route, HashRouter, Navigate } from "react-router-dom";
import Rules from "./Rules";
import Setting from "./Setting";
import Layout from "./Layout";
import { SettingProvider } from "../../hooks/Setting";
import ThemeProvider from "../../hooks/Theme";
import { AlertProvider } from "../../hooks/Alert";
import { ConfirmProvider } from "../../hooks/Confirm";
import Tranbox from "./Tranbox";
import SubtitleSetting from "./Subtitle";
import StylesSetting from "./StylesSetting";
import Providers from "./Providers";
import Showcase from "../Showcase";
import About from "./About";

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
                  <Route path="subtitle" element={<SubtitleSetting />} />
                  <Route
                    path="apis"
                    element={<Navigate to="/providers" replace />}
                  />
                  <Route path="providers" element={<Providers />} />
                  <Route path="data" element={<Setting section="data" />} />
                  <Route
                    path="shortcuts"
                    element={<Setting section="shortcuts" />}
                  />
                  <Route path="about" element={<About />} />
                  {process.env.NODE_ENV === "development" && (
                    <Route path="showcase" element={<Showcase />} />
                  )}
                </Route>
              </Routes>
            </HashRouter>
          </ConfirmProvider>
        </AlertProvider>
      </ThemeProvider>
    </SettingProvider>
  );
}

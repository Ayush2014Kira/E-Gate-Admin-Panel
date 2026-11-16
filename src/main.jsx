import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import { AuthProvider } from "./auth";
import App from "./App";
import "./index.css";

const theme = {
  token: {
    colorPrimary: "#0b5d93",
    colorLink: "#0b5d93",
    colorText: "#0f2a3f",
    colorTextSecondary: "#5b6b7d",
    // Same darker borders as the VMS app: inputs / selects, then cards, tables and dividers
    colorBorder: "#c9cdd2",
    colorBorderSecondary: "#d6dee8",
    fontSize: 13,
    borderRadius: 10,
    borderRadiusLG: 16,
    fontFamily: "Poppins, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: "transparent", bodyBg: "#f4f7fb" },
    Card: { headerFontSize: 14 },
    Table: { headerBg: "#f8fafc", headerColor: "#5b6b7d", rowHoverBg: "#f3f8fd" },
    Button: { fontWeight: 600, primaryShadow: "0 6px 16px -6px rgba(11, 93, 147, 0.55)" },
    Segmented: { itemSelectedBg: "#ffffff", trackBg: "#eef3f8" },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/eGate-admin">
      <ConfigProvider theme={theme}>
        <AntApp>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);

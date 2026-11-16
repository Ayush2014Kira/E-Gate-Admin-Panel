import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, Dropdown, Grid, Layout, Menu, Tooltip } from "antd";
import {
  AppstoreOutlined,
  CrownOutlined,
  BankOutlined,
  GlobalOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../auth";
import api, { COUNTS_CHANGED_EVENT } from "../api";

const { Sider, Header, Content } = Layout;

const AppLayout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  // screens is empty on the first render; treat that as desktop so the sidebar does not flash closed
  const isMobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(true);
  const [pending, setPending] = useState(0);

  const loadPending = useCallback(() => {
    api.stats().then((s) => setPending(s.companies.pending)).catch(() => {});
  }, []);

  useEffect(() => {
    loadPending();
    window.addEventListener(COUNTS_CHANGED_EVENT, loadPending);
    return () => window.removeEventListener(COUNTS_CHANGED_EVENT, loadPending);
  }, [loadPending]);

  const nav = [
    { key: "/", icon: <AppstoreOutlined />, label: "Dashboard" },
    {
      key: "/companies",
      icon: <BankOutlined />,
      label: (
        <>
          Companies
          {pending > 0 && <span className="sider-badge">{pending}</span>}
        </>
      ),
    },
    { key: "/plans", icon: <CrownOutlined />, label: "Plans" },
    { key: "/landing", icon: <GlobalOutlined />, label: "Landing page" },
    { key: "/admins", icon: <TeamOutlined />, label: "Admin users" },
  ];

  const selected = pathname === "/" ? "/" : nav.find((item) => item.key !== "/" && pathname.startsWith(item.key))?.key;

  const go = ({ key }) => {
    navigate(key);
    if (isMobile) setCollapsed(true);
  };

  const accountMenu = {
    items: [
      { key: "account", icon: <LockOutlined />, label: "Change password" },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Log out", danger: true },
    ],
    onClick: ({ key }) => (key === "logout" ? logout() : navigate("/account")),
  };

  const initial = (admin.name || admin.email).charAt(0).toUpperCase();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        className="app-sider"
        width={248}
        collapsedWidth={0}
        collapsed={isMobile ? collapsed : false}
        trigger={null}
        style={
          isMobile
            ? { position: "fixed", height: "100vh", zIndex: 20 }
            : { position: "sticky", top: 0, height: "100vh" }
        }
      >
        <img src={`${import.meta.env.BASE_URL}egate-logo-white.svg`} alt="E-Gate" className="sider-logo" />
        <div className="sider-section">MANAGE</div>
        <Menu theme="dark" mode="inline" selectedKeys={selected ? [selected] : []} items={nav} onClick={go} />
        <div className="sider-footer">
          <Avatar style={{ background: "linear-gradient(135deg, #3ba1e1, #0b5d93)", flexShrink: 0 }}>{initial}</Avatar>
          <div className="who">
            <div style={{ fontWeight: 700 }}>{admin.name || "Admin"}</div>
            <div className="email">{admin.email}</div>
          </div>
          <Tooltip title="Log out">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: "rgba(255,255,255,0.7)" }}
              aria-label="Log out"
            />
          </Tooltip>
        </div>
      </Sider>
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: "fixed", inset: 0, background: "rgba(0, 20, 35, 0.45)", zIndex: 10 }}
        />
      )}
      <Layout>
        <Header className="app-header">
          {isMobile ? (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(false)} aria-label="Open menu" />
          ) : (
            <span className="today">{dayjs().format("dddd, D MMMM YYYY")}</span>
          )}
          <Dropdown menu={accountMenu} trigger={["click"]}>
            <Button type="text" style={{ display: "flex", alignItems: "center", gap: 8, height: 40 }}>
              <Avatar size="small" style={{ background: "linear-gradient(135deg, #3ba1e1, #0b5d93)" }}>
                {initial}
              </Avatar>
              {!isMobile && <span>{admin.name || admin.email}</span>}
            </Button>
          </Dropdown>
        </Header>
        <Content className="app-content">
          <div className="page" key={pathname}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;

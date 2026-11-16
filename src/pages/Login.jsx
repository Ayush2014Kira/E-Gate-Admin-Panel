import { useState } from "react";
import { Alert, Button, ConfigProvider, Form, Input } from "antd";
import { ArrowRightOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, StopOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useAuth } from "../auth";
import { errorMessage } from "../api";

// Same card as the E-Gate website's login and registration: navy panel on the left, form on the right
const POINTS = [
  { icon: <SafetyCertificateOutlined />, title: "Approve new companies", desc: "Registrations wait for your review" },
  { icon: <StopOutlined />, title: "Suspend in one click", desc: "Everyone in that company is logged out" },
  { icon: <ThunderboltOutlined />, title: "Admins stay informed", desc: "They are emailed on every change" },
];

const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#3ba1e1",
          borderRadius: 8,
          controlHeight: 42,
          fontSize: 14,
          fontFamily: "Poppins, sans-serif",
        },
      }}
    >
      <div className="login-page">
        <div className="login-card">
          <aside className="login-aside">
            <img src={`${import.meta.env.BASE_URL}egate-logo-white.svg`} alt="E-Gate" className="login-logo" />

            <div className="login-intro">
              <span className="login-eyebrow">Admin panel</span>
              <h1>Welcome back</h1>
              <p>Review new registrations, approve the right ones, and pause any account.</p>
            </div>

            <ol className="login-points">
              {POINTS.map((p) => (
                <li key={p.title}>
                  <span className="login-dot">{p.icon}</span>
                  <span>
                    <b>{p.title}</b>
                    <small>{p.desc}</small>
                  </span>
                </li>
              ))}
            </ol>

            <p className="login-foot">E-Gate visitor management</p>
          </aside>

          <main className="login-main">
            <span className="login-step">Admin login</span>
            <h2>Sign in to your account</h2>
            <p className="login-sub">Log in to manage registered companies.</p>
            <div className="login-bar" />

            {error && <Alert type="error" message={error} showIcon style={{ marginTop: 20 }} />}

            <Form layout="vertical" onFinish={onFinish} className="login-form">
              <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
                <Input prefix={<MailOutlined className="login-icon" />} placeholder="name@company.com" autoComplete="username" autoFocus />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password" }]}>
                <Input.Password prefix={<LockOutlined className="login-icon" />} placeholder="Your password" autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} className="login-btn">
                Log in {!loading && <ArrowRightOutlined />}
              </Button>
            </Form>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Login;

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Table } from "antd";
import {
  ArrowRightOutlined, BankOutlined, ClockCircleOutlined, CloseCircleOutlined, IdcardOutlined, RiseOutlined, TeamOutlined, WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api, { errorMessage } from "../api";
import { useAuth } from "../auth";
import CompanyCell from "../components/CompanyCell";
import HexArt from "../components/HexArt";
import { STATUS, StatusActions } from "../components/status";

dayjs.extend(relativeTime);

const greeting = () => {
  const hour = dayjs().hour();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

// One status: icon, count and its share of all companies; opens the companies list with that status
const StatCard = ({ status, value, total, onClick }) => {
  const s = STATUS[status];
  return (
    <button type="button" className="stat-card" onClick={onClick}>
      <span className="stat-icon" style={{ background: s.bg, color: s.color }}>
        {s.icon}
      </span>
      <span className="stat-text">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{s.label}</span>
      </span>
      <span className="stat-share">{total ? `${Math.round((value / total) * 100)}%` : "—"}</span>
      <ArrowRightOutlined className="stat-go" />
    </button>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.stats(), api.companies({ status: "pending", limit: 10 })]);
      setStats(s);
      setPending(p);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companies = stats?.companies || {};
  const total = companies.total || 0;
  const waiting = companies.pending || 0;

  const columns = [
    {
      title: "Company",
      render: (_, c) => <CompanyCell company={c} sub={c.adminName} />,
    },
    {
      title: "Contact",
      responsive: ["md"],
      render: (_, c) => (
        <>
          <div>{c.adminEmail}</div>
          <div className="muted">{c.adminPhoneNo}</div>
        </>
      ),
    },
    {
      title: "Registered",
      dataIndex: "createdAt",
      responsive: ["sm"],
      render: (value) => <span title={dayjs(value).format("DD MMM YYYY, h:mm A")}>{dayjs(value).fromNow()}</span>,
    },
    {
      title: "",
      align: "right",
      render: (_, c) => <StatusActions company={c} size="small" onChanged={load} />,
    },
  ];

  return (
    <>
      <section className="hero">
        <HexArt className="hero-art" />
        <div className="hero-text">
          <h2>
            {greeting()}, {admin.name || "Admin"}
          </h2>
          <p>
            {!stats
              ? "Loading the latest numbers…"
              : waiting > 0
                ? `${waiting} ${waiting === 1 ? "company is" : "companies are"} waiting for your approval. They cannot log in until you review them.`
                : "All caught up. No company is waiting for approval right now."}
          </p>
        </div>
        {stats && waiting > 0 && (
          <div className="hero-action">
            <span className="hero-count">
              <b>{waiting}</b> waiting
            </span>
            <Button onClick={() => navigate("/companies?status=pending")} icon={<ArrowRightOutlined />} iconPosition="end">
              Review now
            </Button>
          </div>
        )}
      </section>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]}>
        {Object.keys(STATUS).map((status) => (
          <Col xs={12} lg={6} key={status}>
            {stats ? (
              <StatCard
                status={status}
                value={companies[status] ?? 0}
                total={total}
                onClick={() => navigate(`/companies?status=${status}`)}
              />
            ) : (
              <div className="stat-card is-loading">
                <Skeleton active avatar paragraph={false} />
              </div>
            )}
          </Col>
        ))}
      </Row>

      {/* Plans that need the team: ending soon, in grace, expired */}
      {stats?.plans && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            { key: "expiring", label: "Plans ending this week", icon: <ClockCircleOutlined />, bg: "#fef3c7", color: "#b45309" },
            { key: "grace", label: "In grace", icon: <WarningOutlined />, bg: "#ffedd5", color: "#9a3412" },
            { key: "expired", label: "Expired plans", icon: <CloseCircleOutlined />, bg: "#fee2e2", color: "#b91c1c" },
          ].map((p) => (
            <Col xs={24} sm={8} key={p.key}>
              <button type="button" className="stat-card" onClick={() => navigate(`/companies?plan=${p.key}`)}>
                <span className="stat-icon" style={{ background: p.bg, color: p.color }}>
                  {p.icon}
                </span>
                <span className="stat-text">
                  <span className="stat-value">{stats.plans[p.key]}</span>
                  <span className="stat-label">{p.label}</span>
                </span>
                <ArrowRightOutlined className="stat-go" />
              </button>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card className="panel" title="Company status" style={{ height: "100%" }} loading={!stats}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="total-count">{total}</span>
              <span className="muted">registered companies</span>
            </div>
            <div className="mix-bar" role="img" aria-label="Companies by status">
              {Object.entries(STATUS).map(([status, s]) =>
                companies[status] ? (
                  <span
                    key={status}
                    title={`${s.label}: ${companies[status]}`}
                    style={{ width: `${(companies[status] / total) * 100}%`, background: s.bar }}
                  />
                ) : null
              )}
            </div>
            <div className="legend">
              {Object.entries(STATUS).map(([status, s]) => (
                <div className="legend-item" key={status}>
                  <i style={{ background: s.bar }} />
                  {s.label}
                  <b>{companies[status] ?? 0}</b>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="panel" title="Across E-Gate" style={{ height: "100%" }} loading={!stats}>
            {[
              { icon: <RiseOutlined />, label: "New in the last 7 days", value: stats?.newThisWeek, tint: "#e0f2fe", color: "#0369a1" },
              { icon: <TeamOutlined />, label: "Users in all companies", value: stats?.users, tint: "#ede9fe", color: "#6d28d9" },
              { icon: <IdcardOutlined />, label: "Passes issued", value: stats?.passes, tint: "#fce7f3", color: "#be185d" },
              { icon: <BankOutlined />, label: "Approved companies", value: companies.approved, tint: "#dcfce7", color: "#15803d" },
            ].map((m) => (
              <div className="metric-row" key={m.label}>
                <div className="stat-icon" style={{ background: m.tint, color: m.color }}>
                  {m.icon}
                </div>
                <span style={{ fontWeight: 600 }}>{m.label}</span>
                <b>{m.value ?? 0}</b>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card
        className="panel"
        title={
          <span>
            Waiting for approval{" "}
            {pending.total > 0 && (
              <span className="status-pill pending" style={{ color: STATUS.pending.color, background: STATUS.pending.bg, marginLeft: 6 }}>
                {pending.total}
              </span>
            )}
          </span>
        }
        extra={<Link to="/companies?status=pending">View all</Link>}
        style={{ marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={pending.items}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No company is waiting for approval" /> }}
          onRow={(c) => ({ onClick: () => navigate(`/companies/${c._id}`), style: { cursor: "pointer" } })}
        />
      </Card>
    </>
  );
};

export default Dashboard;

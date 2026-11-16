import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Breadcrumb, Card, Col, Descriptions, Empty, List, Result, Row, Skeleton, Tag, Timeline } from "antd";
import { EnvironmentOutlined, IdcardOutlined, ShopOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api, { errorMessage } from "../api";
import { CompanyLogo } from "../components/CompanyCell";
import { STATUS, StatusActions, StatusTag } from "../components/status";
import SubscriptionCard from "../components/SubscriptionCard";
import { requestedPlanText } from "../components/plan";

const formatDate = (value) => (value ? dayjs(value).format("DD MMM YYYY, h:mm A") : "—");
const fullName = (user) => [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
const address = (office) =>
  [office.address_line1, office.address_line2, office.address_city, office.address_state, office.pincode]
    .filter(Boolean)
    .join(", ");

const STATUS_NOTE = {
  pending: { type: "warning", text: "This company cannot log in until you approve it." },
  rejected: { type: "error", text: "This registration was rejected. Nobody from this company can log in." },
  suspended: { type: "error", text: "This company is suspended. Nobody from this company can log in." },
};

const COUNT_TILES = [
  { key: "offices", label: "Offices", icon: <ShopOutlined />, tint: "#e0f2fe", color: "#0369a1" },
  { key: "users", label: "Users", icon: <TeamOutlined />, tint: "#ede9fe", color: "#6d28d9" },
  { key: "visitors", label: "Visitors", icon: <UserOutlined />, tint: "#fef3c7", color: "#b45309" },
  { key: "passes", label: "Passes", icon: <IdcardOutlined />, tint: "#fce7f3", color: "#be185d" },
];

const CompanyDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.company(id));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !data) {
    return error.response?.status === 404 ? (
      <Result status="404" title="Company not found" extra={<Link to="/companies">Back to companies</Link>} />
    ) : (
      <Alert type="error" message={errorMessage(error)} showIcon />
    );
  }
  if (!data) return <Skeleton active avatar paragraph={{ rows: 8 }} />;

  const { company, offices, admins, counts } = data;
  const note = STATUS_NOTE[company.approvalStatus];
  const status = STATUS[company.approvalStatus];
  const changedBy = company.statusUpdatedBy && (company.statusUpdatedBy.name || company.statusUpdatedBy.email);

  // Registration first, then the latest status change (only the latest is stored).
  const history = [
    { color: "#0b5d93", children: (<><b>Registered</b><div className="muted">{formatDate(company.createdAt)}</div></>) },
  ];
  if (company.statusUpdatedAt && company.approvalStatus !== "pending") {
    history.push({
      color: status?.bar,
      children: (
        <>
          <b>Marked {status?.label.toLowerCase()}</b>
          <div className="muted">
            {formatDate(company.statusUpdatedAt)}
            {changedBy && ` · by ${changedBy}`}
          </div>
          {company.statusReason && <div style={{ marginTop: 4 }}>“{company.statusReason}”</div>}
        </>
      ),
    });
  } else if (company.approvalStatus === "pending") {
    history.push({ color: STATUS.pending.bar, children: <b>Waiting for your review</b> });
  }

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[{ title: <Link to="/companies">Companies</Link> }, { title: company.companyName }]}
      />

      <section className="company-hero">
        <div className="cover" />
        <div className="body">
          <div className="identity">
            <div className="logo-ring">
              <CompanyLogo company={company} size={76} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1>{company.companyName}</h1>
                <StatusTag status={company.approvalStatus} />
              </div>
              <div className="muted">
                {company.companyTagline || `Registered ${dayjs(company.createdAt).format("D MMM YYYY")}`}
              </div>
            </div>
          </div>
          <StatusActions company={company} onChanged={load} />
        </div>
        {note && (
          <div style={{ padding: "0 24px 20px" }}>
            <Alert type={note.type} message={note.text} showIcon />
          </div>
        )}
      </section>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {COUNT_TILES.map((t) => (
          <Col xs={12} md={6} key={t.key}>
            <Card className="panel">
              <div className="mini-stat">
                <div className="stat-icon" style={{ background: t.tint, color: t.color }}>
                  {t.icon}
                </div>
                <div>
                  <div className="stat-value">{counts[t.key]}</div>
                  <div className="stat-label">{t.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* key: a status change (approve starts the trial) reloads the plan */}
      <SubscriptionCard key={`${company.approvalStatus}-${company.statusUpdatedAt}`} company={company} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="panel" title="Registration details" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" styles={{ label: { width: 150, color: "#5b6b7d" } }}>
              <Descriptions.Item label="Company name">{company.companyName}</Descriptions.Item>
              <Descriptions.Item label="Admin name">{company.adminName || "—"}</Descriptions.Item>
              <Descriptions.Item label="Admin email">
                <a href={`mailto:${company.adminEmail}`}>{company.adminEmail}</a>
              </Descriptions.Item>
              <Descriptions.Item label="Admin phone">{company.adminPhoneNo || "—"}</Descriptions.Item>
              <Descriptions.Item label="Plan picked">{requestedPlanText(company.requestedPlan) || "—"}</Descriptions.Item>
              <Descriptions.Item label="Description">{company.companyDescription || "—"}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="panel" title="History">
            <Timeline items={history} style={{ marginTop: 8, marginBottom: -16 }} />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="panel" title="Company admins" style={{ marginBottom: 16 }}>
            <List
              dataSource={admins}
              locale={{ emptyText: <Empty description="No admins" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(user) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <>
                        {fullName(user)}{" "}
                        <Tag bordered={false} color={user.userType === "superAdmin" ? "blue" : "default"} style={{ marginLeft: 4 }}>
                          {user.userType === "superAdmin" ? "Main admin" : "Office admin"}
                        </Tag>
                      </>
                    }
                    description={[user.email, user.mobileNumber].filter(Boolean).join(" · ")}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card className="panel" title={`Offices (${offices.length})`}>
            <List
              dataSource={offices}
              locale={{ emptyText: <Empty description="No offices" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              renderItem={(office) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div className="stat-icon" style={{ width: 34, height: 34, fontSize: 15, background: "#eef3f8", color: "#0b5d93" }}>
                        <EnvironmentOutlined />
                      </div>
                    }
                    title={office.officeName || "Office"}
                    description={address(office) || "—"}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default CompanyDetail;

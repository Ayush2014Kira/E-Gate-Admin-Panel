import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Card, Input, Segmented, Select, Table } from "antd";
import dayjs from "dayjs";
import api, { errorMessage } from "../api";
import CompanyCell from "../components/CompanyCell";
import { STATUS, StatusActions, StatusTag } from "../components/status";
import { EndsIn, PlanStateTag, requestedPlanText } from "../components/plan";

// Approved companies by where their plan stands
const PLAN_FILTERS = [
  { value: "", label: "Any plan" },
  { value: "expiring", label: "Ending in 7 days" },
  { value: "grace", label: "In grace" },
  { value: "expired", label: "Expired" },
  { value: "none", label: "No plan" },
];

const PAGE_SIZE = 20;

// Segmented options with the number of companies in each status.
const filterOptions = (counts) =>
  [["", "All", counts?.total], ...Object.entries(STATUS).map(([value, s]) => [value, s.label, counts?.[value]])].map(
    ([value, label, count]) => ({
      value,
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          {label}
          {count !== undefined && (
            <span style={{ fontSize: 11, lineHeight: "18px", padding: "0 7px", borderRadius: 999, background: "#e3ebf3", color: "#3b4b5c" }}>
              {count}
            </span>
          )}
        </span>
      ),
    })
  );

const Companies = () => {
  const navigate = useNavigate();
  // Filters live in the URL so the dashboard can link here and Back keeps them.
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const plan = params.get("plan") || "";
  const search = params.get("search") || "";
  const page = Number(params.get("page")) || 1;

  const [data, setData] = useState({ items: [], total: 0 });
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.companies({ status: status || undefined, plan: plan || undefined, search: search || undefined, page, limit: PAGE_SIZE }),
        api.stats(),
      ]);
      setData(list);
      setCounts(stats.companies);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, plan, search, page]);

  useEffect(() => {
    load();
  }, [load]);

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
      title: "Offices",
      align: "center",
      responsive: ["lg"],
      render: (_, c) => <b>{c.counts?.offices ?? 0}</b>,
    },
    {
      title: "Users",
      align: "center",
      responsive: ["lg"],
      render: (_, c) => <b>{c.counts?.users ?? 0}</b>,
    },
    {
      title: "Plan",
      responsive: ["sm"],
      render: (_, c) =>
        c.approvalStatus === "approved" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b>{c.plan?.planName || "—"}</b>
              {c.plan && c.plan.state !== "active" && <PlanStateTag state={c.plan.state} />}
            </div>
            {c.plan?.endsAt && (
              <div className="muted">
                {/* A cancelled plan ends "now" (0 days left): it has ended, not "ends today" */}
                {c.plan.daysLeft < 0 || c.plan.state === "expired" || c.plan.state === "grace" ? "Ended " : "Ends "}
                <EndsIn plan={c.plan} />
              </div>
            )}
          </>
        ) : c.requestedPlan?.name ? (
          // Not approved yet: the plan they picked on the pricing section
          <span className="muted">Picked: {requestedPlanText(c.requestedPlan)}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "Registered",
      dataIndex: "createdAt",
      responsive: ["xl"],
      render: (value) => dayjs(value).format("DD MMM YYYY"),
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: "",
      align: "right",
      responsive: ["md"],
      render: (_, c) => <StatusActions company={c} size="small" onChanged={load} />,
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p>Approve new registrations and manage existing companies</p>
        </div>
      </div>

      <Card className="panel" styles={{ body: { padding: 0 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: 16, justifyContent: "space-between" }}>
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <Segmented
              size="large"
              options={filterOptions(counts)}
              value={status}
              onChange={(value) => update({ status: value, page: "" })}
            />
          </div>
          <Select
            size="large"
            value={plan}
            onChange={(value) => update({ plan: value, status: value ? "" : status, page: "" })}
            options={PLAN_FILTERS}
            style={{ width: 180 }}
            aria-label="Filter by plan"
          />
          <Input.Search
            size="large"
            allowClear
            placeholder="Search company, admin, email or phone"
            defaultValue={search}
            onSearch={(value) => update({ search: value.trim(), page: "" })}
            style={{ width: 320, maxWidth: "100%" }}
          />
        </div>
        {error && <Alert type="error" message={error} showIcon style={{ margin: "0 16px 16px" }} />}
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: "max-content" }}
          onRow={(c) => ({ onClick: () => navigate(`/companies/${c._id}`), style: { cursor: "pointer" } })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data.total,
            showSizeChanger: false,
            showTotal: (total) => `${total} ${total === 1 ? "company" : "companies"}`,
            onChange: (next) => update({ page: next > 1 ? String(next) : "" }),
            style: { paddingInline: 16 },
          }}
        />
      </Card>
    </>
  );
};

export default Companies;

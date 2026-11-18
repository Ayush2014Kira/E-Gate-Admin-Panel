import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Empty, Input, Modal, Progress, Skeleton, Space, Table, Tag } from "antd";
import { CalendarOutlined, DeleteOutlined, StopOutlined, SwapOutlined } from "@ant-design/icons";
import api, { errorMessage, refreshCounts } from "../api";
import { EndsIn, PlanModal, PlanStateTag, formatDay, limitText, rupees } from "./plan";

const ACTION_LABEL = {
  trial: "Free trial",
  assign: "Plan assigned",
  change: "Plan changed",
  extend: "Extended",
  cancel: "Cancelled",
  legacy: "Given at launch",
};
const STATUS_LABEL = { trial: "Trial", active: "Active", replaced: "Replaced", cancelled: "Cancelled", removed: "Removed" };

const usageColor = (pct) => (pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "#3ba1e1");

// Company detail: the plan now, usage against its limits, buttons to change it, and every period so far
const SubscriptionCard = ({ company }) => {
  const { message, modal: confirm } = App.useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // "assign" | "extend"
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.subscription(company._id));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [company._id]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async () => {
    setBusy(true);
    try {
      await api.setSubscription(company._id, { action: "cancel", note: reason.trim() });
      message.success("Plan cancelled");
      setCancelling(false);
      refreshCounts();
      load();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // An extension added by mistake: only the latest one can be taken back
  const removeExtension = (s) =>
    confirm.confirm({
      title: "Remove this extension?",
      content: (
        <>
          The {s.planSnapshot?.name} period <b>{formatDay(s.startAt)} – {formatDay(s.endAt)}</b> will be removed and the plan
          will end on its earlier date. The company admin gets a correction email.
        </>
      ),
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.setSubscription(company._id, { action: "remove", subscriptionId: s._id });
          message.success("Extension removed");
          refreshCounts();
          load();
        } catch (err) {
          message.error(errorMessage(err));
        }
      },
    });

  if (error && !data) return <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />;
  if (!data) {
    return (
      <Card className="panel" title="Plan" style={{ marginBottom: 16 }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  const { current: plan, usage, history, names } = data;
  const hasPlan = plan.state !== "none";
  const approved = company.approvalStatus === "approved";

  const columns = [
    {
      title: "Plan",
      render: (_, s) => (
        <>
          <b>{s.planSnapshot?.name}</b>
          <div className="muted">{ACTION_LABEL[s.action] || s.action}</div>
        </>
      ),
    },
    {
      title: "Period",
      render: (_, s) => `${formatDay(s.startAt)} – ${formatDay(s.endAt)}`,
    },
    {
      title: "Payment",
      responsive: ["md"],
      render: (_, s) =>
        s.payment?.mode ? (
          <>
            <div>
              {s.payment.mode} {s.payment.amount ? `· ${rupees(s.payment.amount)}` : ""}
            </div>
            {s.payment.reference && <div className="muted">{s.payment.reference}</div>}
          </>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "By",
      responsive: ["lg"],
      render: (_, s) => (
        <>
          <div>{s.createdBy?.name || "System"}</div>
          {s.note && <div className="muted" style={{ maxWidth: 220 }}>{s.note}</div>}
        </>
      ),
    },
    {
      title: "",
      align: "right",
      render: (_, s) => (
        <Space size={4}>
          <Tag bordered={false} color={s.status === "cancelled" || s.status === "removed" ? "red" : s.status === "replaced" ? "default" : "blue"}>
            {STATUS_LABEL[s.status]}
          </Tag>
          {s.canRemove && approved && (
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeExtension(s)} aria-label="Remove this extension">
              Remove
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      className="panel sub-card"
      title={
        <Space size={10}>
          Plan
          <PlanStateTag state={plan.state} />
        </Space>
      }
      extra={
        approved && (
          <Space wrap size="small">
            {hasPlan && (
              <Button icon={<CalendarOutlined />} type="primary" onClick={() => setModal("extend")}>
                Extend
              </Button>
            )}
            <Button icon={<SwapOutlined />} onClick={() => setModal("assign")}>
              {hasPlan ? "Change plan" : "Assign plan"}
            </Button>
            {hasPlan && plan.state !== "expired" && (
              <Button danger icon={<StopOutlined />} onClick={() => setCancelling(true)}>
                Cancel
              </Button>
            )}
          </Space>
        )
      }
      style={{ marginBottom: 16 }}
    >
      {!hasPlan ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={approved ? "No plan yet. Assign one so the company can use E-Gate." : "The company gets a plan when it is approved."}
        />
      ) : (
        <>
          <div className="sub-summary">
            <div>
              <div className="sub-plan">{plan.planName}</div>
              <div className="muted">
                {formatDay(plan.endsAt) !== "—" && (
                  <>
                    {plan.state === "expired" || plan.state === "grace" ? "Ended" : "Runs until"} {formatDay(plan.endsAt)} (
                    <EndsIn plan={plan} />)
                  </>
                )}
              </div>
            </div>
            {plan.state === "grace" && (
              <Alert type="warning" showIcon message={`In grace: everything works until ${formatDay(plan.graceUntil)}.`} />
            )}
            {plan.state === "expired" && (
              <Alert type="error" showIcon message="Expired: the company can only view its data until the plan is renewed." />
            )}
          </div>

          <div className="sub-usage">
            {Object.entries(names.limits).map(([key, label]) => {
              const max = plan.limits[key];
              const used = usage[key] ?? 0;
              const unlimited = max === -1;
              const pct = unlimited ? 0 : max ? Math.min(100, Math.round((used / max) * 100)) : used ? 100 : 0;
              return (
                <div key={key} className="sub-usage-item">
                  <div className="sub-usage-top">
                    <span>{label}</span>
                    <b>
                      {used.toLocaleString("en-IN")} <span className="muted">/ {limitText(max)}</span>
                    </b>
                  </div>
                  <Progress percent={unlimited ? 0 : pct} showInfo={false} size="small" strokeColor={usageColor(pct)} />
                </div>
              );
            })}
          </div>

          <div className="sub-features">
            {Object.entries(names.features).map(([key, label]) => (
              <Tag key={key} bordered={false} color={plan.features[key] ? "green" : "default"} className={plan.features[key] ? "" : "is-off"}>
                {plan.features[key] ? "✓" : "✕"} {label}
              </Tag>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <Table
          className="sub-history"
          rowKey="_id"
          size="small"
          columns={columns}
          dataSource={history}
          pagination={history.length > 5 ? { pageSize: 5, size: "small" } : false}
        />
      )}

      <PlanModal
        open={!!modal}
        mode={modal || "assign"}
        company={company}
        current={plan}
        usage={usage}
        onClose={() => setModal(null)}
        onSaved={load}
      />
      <Modal
        open={cancelling}
        title={`Cancel the plan of ${company.companyName}?`}
        okText="Cancel plan"
        cancelText="Keep it"
        okButtonProps={{ danger: true, loading: busy }}
        onOk={cancel}
        onCancel={() => setCancelling(false)}
        destroyOnHidden
      >
        <p>The plan ends today with no grace days. The company can only view its data until a new plan starts.</p>
        <Input.TextArea rows={2} maxLength={300} placeholder="Reason (only the E-Gate team sees it)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
};

export default SubscriptionCard;

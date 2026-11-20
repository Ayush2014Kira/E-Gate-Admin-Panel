import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, App, Button, Card, Input, Modal, Segmented, Space, Table, Tag } from "antd";
import api, { errorMessage, refreshCounts } from "../api";
import { formatDay, planRequestText } from "../components/plan";

// Plan requests sent by companies from their dashboard (Settings → Plan & billing).
// Approving opens the company's plan form filled in with the request; declining emails the company.

const STATUS = {
  pending: { color: "blue", label: "Waiting" },
  approved: { color: "green", label: "Approved" },
  declined: { color: "red", label: "Declined" },
  withdrawn: { color: "default", label: "Withdrawn" },
};

const PlanRequests = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    api
      .planRequests(status === "all" ? {} : { status })
      .then((list) => {
        setRows(list);
        setError(null);
      })
      .catch((err) => {
        setRows([]);
        setError(errorMessage(err));
      });
  }, [status]);
  useEffect(load, [load]);

  const decline = async () => {
    setBusy(true);
    try {
      await api.declinePlanRequest(declining._id, reply.trim());
      message.success("Request declined. The company admin gets an email.");
      setDeclining(null);
      setReply("");
      refreshCounts();
      load();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      title: "Company",
      width: 170,
      render: (_, r) =>
        r.company ? <Link to={`/companies/${r.companyId}`}>{r.company.companyName}</Link> : <span className="muted">Deleted company</span>,
    },
    {
      title: "Request",
      width: 280,
      render: (_, r) => (
        <>
          <div>{planRequestText(r)}</div>
          <div className="muted">
            {r.currentPlanName ? `Now on ${r.currentPlanName}` : "No plan now"} ·{" "}
            {r.startWhen === "afterCurrent" ? "start after the current plan" : "start right away"}
          </div>
          {r.note && <div className="muted">“{r.note}”</div>}
        </>
      ),
    },
    {
      title: "Asked by",
      width: 220,
      render: (_, r) => (
        <>
          <div>{r.requestedByName || "—"}</div>
          <div className="muted">{r.requestedByEmail}</div>
        </>
      ),
    },
    { title: "Sent", dataIndex: "createdAt", render: formatDay, width: 120 },
    {
      // Status and, for a waiting request, its buttons: one column pinned on the right on every tab,
      // so the outcome (or Approve / Decline) is always in view without scrolling sideways
      key: "status",
      title: "Status",
      width: 180,
      fixed: "right",
      render: (_, r) => (
        <>
          <Tag bordered={false} color={STATUS[r.status]?.color}>
            {STATUS[r.status]?.label}
          </Tag>
          {r.handledAt && r.status !== "pending" && (
            <div className="muted">
              {formatDay(r.handledAt)}
              {r.handledBy?.name && ` · ${r.handledBy.name}`}
            </div>
          )}
          {r.reply && <div className="muted">“{r.reply}”</div>}
          {r.status === "pending" && r.company && (
            <Space size={6} wrap style={{ marginTop: 8 }}>
              <Button size="small" type="primary" onClick={() => navigate(`/companies/${r.companyId}?request=${r._id}`)}>
                Approve…
              </Button>
              <Button size="small" danger onClick={() => setDeclining(r)}>
                Decline
              </Button>
            </Space>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Plan requests</h1>
          <p className="muted">Companies ask to renew or upgrade from their dashboard (Settings → Plan &amp; billing).</p>
        </div>
      </div>
      <Card className="panel">
        <Segmented
          value={status}
          onChange={setStatus}
          style={{ marginBottom: 16 }}
          options={[
            { value: "pending", label: "Waiting" },
            { value: "approved", label: "Approved" },
            { value: "declined", label: "Declined" },
            { value: "all", label: "All" },
          ]}
        />
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Table
          rowKey="_id"
          loading={rows === null}
          columns={columns}
          dataSource={rows || []}
          scroll={{ x: 950 }}
          locale={{ emptyText: status === "pending" ? "No requests waiting" : "No requests" }}
          pagination={(rows?.length || 0) > 20 ? { pageSize: 20 } : false}
        />
      </Card>

      <Modal
        open={!!declining}
        title={declining ? `Decline the request from ${declining.company?.companyName}?` : ""}
        okText="Decline"
        okButtonProps={{ danger: true, loading: busy }}
        onOk={decline}
        onCancel={() => setDeclining(null)}
        destroyOnHidden
      >
        <p>{declining && planRequestText(declining)}. The company admin gets an email with your message.</p>
        <Input.TextArea
          rows={3}
          maxLength={300}
          showCount
          placeholder="Message for the company (optional), e.g. please call us to agree the price"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          style={{ marginBottom: 20 }}
        />
      </Modal>
    </>
  );
};

export default PlanRequests;

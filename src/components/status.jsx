import { useState } from "react";
import { App, Button, Form, Input, Modal, Space } from "antd";
import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import api, { errorMessage, refreshCounts } from "../api";
import { PlanModal } from "./plan";

// color = text / dot, bg = soft background, bar = solid colour for charts
export const STATUS = {
  pending: { label: "Pending", color: "#b45309", bg: "#fef3c7", bar: "#f59e0b", icon: <ClockCircleOutlined /> },
  approved: { label: "Approved", color: "#15803d", bg: "#dcfce7", bar: "#22c55e", icon: <CheckCircleOutlined /> },
  rejected: { label: "Rejected", color: "#b91c1c", bg: "#fee2e2", bar: "#ef4444", icon: <CloseCircleOutlined /> },
  suspended: { label: "Suspended", color: "#9a3412", bg: "#ffedd5", bar: "#fb923c", icon: <PauseCircleOutlined /> },
};

export const StatusTag = ({ status }) => {
  const info = STATUS[status] || { label: status || "Unknown", color: "#5b6b7d", bg: "#eef3f8" };
  return (
    <span className={`status-pill ${status}`} style={{ color: info.color, background: info.bg }}>
      {info.label}
    </span>
  );
};

// What the Admin Panel can do from each status (the backend enforces the same rules).
const ACTIONS = {
  approve: {
    to: "approved",
    label: "Approve",
    icon: <CheckOutlined />,
    type: "primary",
    confirm: (name) => `Approve ${name}? Their admin will get an email and can log in right away.`,
  },
  reactivate: {
    to: "approved",
    label: "Reactivate",
    icon: <PlayCircleOutlined />,
    type: "primary",
    confirm: (name) => `Reactivate ${name}? Everyone in the company can log in again.`,
  },
  reject: {
    to: "rejected",
    label: "Reject",
    icon: <CloseOutlined />,
    danger: true,
    reasonTitle: (name) => `Reject ${name}`,
    reasonHelp: "The company admin will see this reason in their email.",
  },
  suspend: {
    to: "suspended",
    label: "Suspend",
    icon: <PauseCircleOutlined />,
    danger: true,
    reasonTitle: (name) => `Suspend ${name}`,
    reasonHelp: "Everyone in this company is logged out and cannot log in until you reactivate it.",
  },
};

const ACTIONS_BY_STATUS = {
  pending: ["approve", "reject"],
  rejected: ["approve"],
  approved: ["suspend"],
  suspended: ["reactivate"],
};

// Approve / reject / suspend / reactivate buttons for one company.
export const StatusActions = ({ company, onChanged, size }) => {
  const { message, modal } = App.useApp();
  const [busy, setBusy] = useState(null);
  const [reasonFor, setReasonFor] = useState(null);
  const [approving, setApproving] = useState(false);
  const [form] = Form.useForm();

  const run = async (key, reason, plan) => {
    setBusy(key);
    try {
      const updated = await api.setCompanyStatus(company._id, ACTIONS[key].to, reason, plan);
      message.success(`${company.companyName} is now ${STATUS[updated.approvalStatus].label.toLowerCase()}`);
      setReasonFor(null);
      setApproving(false);
      refreshCounts();
      onChanged?.(updated);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const start = (key) => {
    const action = ACTIONS[key];
    if (action.reasonTitle) {
      form.resetFields();
      setReasonFor(key);
      return;
    }
    // Approving picks the plan the company starts on
    if (key === "approve") {
      setApproving(true);
      return;
    }
    modal.confirm({
      title: `${action.label} company`,
      content: action.confirm(company.companyName),
      okText: action.label,
      onOk: () => run(key),
    });
  };

  const keys = ACTIONS_BY_STATUS[company.approvalStatus] || [];
  const current = reasonFor && ACTIONS[reasonFor];

  // Used inside clickable table rows: keep clicks here (and in the portal'd modal) from opening the row.
  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Space wrap size="small">
        {keys.map((key) => (
          <Button
            key={key}
            size={size}
            type={ACTIONS[key].type}
            danger={ACTIONS[key].danger}
            icon={ACTIONS[key].icon}
            loading={busy === key}
            onClick={() => start(key)}
          >
            {ACTIONS[key].label}
          </Button>
        ))}
      </Space>
      <PlanModal
        open={approving}
        company={company}
        onClose={() => setApproving(false)}
        approve={(plan) => run("approve", undefined, plan)}
      />
      <Modal
        open={!!current}
        title={current?.reasonTitle(company.companyName)}
        okText={current?.label}
        okButtonProps={{ danger: true, loading: !!busy }}
        onCancel={() => setReasonFor(null)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={({ reason }) => run(reasonFor, reason.trim())}>
          {/* Help text above the box: below it, it overlapped the 0/500 character counter */}
          {current?.reasonHelp && <p className="ant-form-item-extra" style={{ marginBottom: 8 }}>{current.reasonHelp}</p>}
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, whitespace: true, message: "Please give a reason" }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </span>
  );
};

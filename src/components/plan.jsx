import { useEffect, useState } from "react";
import { Alert, App, DatePicker, Form, Input, InputNumber, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import api, { errorMessage, refreshCounts } from "../api";

// Where a company's plan stands. color = text / dot, bg = soft background (same look as STATUS).
export const PLAN_STATE = {
  trial: { label: "Trial", color: "#6d28d9", bg: "#ede9fe" },
  active: { label: "Active", color: "#15803d", bg: "#dcfce7" },
  grace: { label: "Grace", color: "#b45309", bg: "#fef3c7" },
  expired: { label: "Expired", color: "#b91c1c", bg: "#fee2e2" },
  none: { label: "No plan", color: "#5b6b7d", bg: "#eef3f8" },
};

export const PlanStateTag = ({ state }) => {
  const s = PLAN_STATE[state] || PLAN_STATE.none;
  return (
    <span className="status-pill" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
};

export const formatDay = (value) => (value ? dayjs(value).format("D MMM YYYY") : "—");

// "in 5 days" / "today" / "3 days ago", coloured when close
export const EndsIn = ({ plan }) => {
  if (!plan?.endsAt) return <span className="muted">—</span>;
  const d = plan.daysLeft;
  const text = d > 1 ? `in ${d} days` : d === 1 ? "tomorrow" : d === 0 ? "today" : `${-d} day${d === -1 ? "" : "s"} ago`;
  const ended = d < 0 || plan.state === "expired" || plan.state === "grace";
  const color = ended ? "#b91c1c" : d <= 7 ? "#b45309" : undefined;
  return (
    <span title={formatDay(plan.endsAt)} style={{ color, fontWeight: color ? 600 : undefined }}>
      {text}
    </span>
  );
};

export const limitText = (n) => (n === -1 || n === undefined ? "Unlimited" : n.toLocaleString("en-IN"));
// The plan the company picked on the pricing section before registering: "Basic · Yearly"
export const requestedPlanText = (rp) =>
  rp?.name ? `${rp.name}${rp.contactSales ? " · Contact sales" : rp.billing === "yearly" ? " · Yearly" : rp.billing === "monthly" ? " · Monthly" : ""}` : "";

export const rupees = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

const DURATIONS = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
  { value: "custom", label: "Till a date" },
];
const PAYMENT_MODES = ["Bank transfer", "UPI", "Cheque", "Cash", "Free"].map((m) => ({ value: m, label: m }));

// Assign a plan / change it / extend the current one. mode: "assign" | "extend".
// approve: used while approving a company (returns the choice instead of saving it).
// usage: the company's counts, to warn when a smaller plan is picked
// request: a plan request sent from the company's dashboard; the form starts with what they asked for
const monthsText = (n) => (n === 12 ? "1 year" : `${n} month${n === 1 ? "" : "s"}`);
// "Renew Pro for 1 year" / "Change to Enterprise for 6 months"
export const planRequestText = (r) => `${r.type === "renew" ? "Renew" : "Change to"} ${r.planName} for ${monthsText(r.months)}`;

export const PlanModal = ({ open, mode = "assign", company, current, usage, onClose, onSaved, approve, request }) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [plans, setPlans] = useState([]);
  // The company's plan now (may be turned off, so looked up in the full list): plans below it cannot be picked
  const [onNow, setOnNow] = useState(null);
  const [names, setNames] = useState({ features: {}, limits: {} });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Approving: the plan picked at sign-up is still on offer (and so pre-selected)
  const [askedAvailable, setAskedAvailable] = useState(false);
  const planId = Form.useWatch("planId", form);
  const duration = Form.useWatch("duration", form);
  const extend = mode === "extend";

  useEffect(() => {
    if (!open) return;
    setError(null);
    api
      .plans()
      .then(({ plans: list, names: n }) => {
        setPlans(list.filter((p) => p.isActive));
        setOnNow(approve ? null : list.find((p) => p.key === current?.planKey) || null);
        setNames(n);
        // Approving: start on the plan the company picked when it registered (if still active),
        // for a year when they picked yearly billing; otherwise the trial as before
        const asked = approve && company?.requestedPlan?.key
          ? list.find((p) => p.isActive && p.key === company.requestedPlan.key)
          : null;
        const start = approve
          ? asked || list.find((p) => p.key === "trial")
          : list.find((p) => p.key === current?.planKey);
        setAskedAvailable(!!asked);
        const duration = asked && company.requestedPlan.billing === "monthly" ? 1 : 12;
        if (request) {
          // "After the current plan ends": the day after it, while it is still running
          const after = request.startWhen === "afterCurrent" && current?.endsAt && dayjs(current.endsAt).isAfter(dayjs());
          const wanted = list.find((p) => p.isActive && p._id === request.planId);
          form.setFieldsValue({
            planId: wanted?._id || start?._id,
            duration: request.months,
            startDate: after ? dayjs(current.endsAt).add(1, "day").startOf("day") : dayjs(),
            payment: {},
          });
          return;
        }
        form.setFieldsValue({ planId: start?._id, duration, startDate: dayjs(), payment: {} });
      })
      .catch((err) => setError(errorMessage(err)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = plans.find((p) => p._id === planId);
  const isTrial = chosen?.key === "trial";
  // Picking a smaller plan: what the company already has more of, and what it loses
  const overLimits =
    !extend && chosen && usage
      ? Object.entries(names.limits)
          .filter(([k]) => chosen.limits[k] !== -1 && (usage[k] ?? 0) > chosen.limits[k])
          .map(([k, label]) => `${label}: ${usage[k]} in use, ${chosen.name} allows ${chosen.limits[k]}`)
      : [];
  const lostFeatures =
    !extend && chosen && current?.features
      ? Object.entries(names.features).filter(([k]) => current.features[k] && !chosen.features[k]).map(([, label]) => label)
      : [];

  // Last day of the new period, as the server will work it out (for the confirmation)
  const newEnd = (values) => {
    if (values.duration === "custom") return values.endDate;
    const start = extend
      ? current?.endsAt && dayjs(current.endsAt).isAfter(dayjs()) ? dayjs(current.endsAt).add(1, "second") : dayjs().startOf("day")
      : values.startDate || dayjs();
    return start.add(values.duration, "month").subtract(1, "day");
  };

  // Extending is easy to do by mistake: ask once more, with the new end date
  const confirmExtend = (values) =>
    modal.confirm({
      title: `Extend ${current?.planName} for ${company.companyName}?`,
      content: (
        <>
          The plan will run until <b>{formatDay(newEnd(values))}</b>
          {current?.endsAt && <> (now {formatDay(current.endsAt)})</>}. The company admin gets an email.
        </>
      ),
      okText: "Yes, extend",
      onOk: () => save(values),
    });

  const save = async (values) => {
    const body = {
      action: extend ? "extend" : "assign",
      planId: values.planId,
      months: isTrial || values.duration === "custom" ? undefined : values.duration,
      endDate: !isTrial && values.duration === "custom" ? values.endDate?.format("YYYY-MM-DD") : undefined,
      startDate: !extend && values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined,
      payment: values.payment,
      note: values.note,
      requestId: request?._id,
    };
    if (approve) return approve(isTrial ? undefined : body);
    setSaving(true);
    setError(null);
    try {
      await api.setSubscription(company._id, body);
      message.success(request ? "Request approved and plan saved" : extend ? "Plan extended" : "Plan saved");
      refreshCounts();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const title = approve
    ? `Approve ${company.companyName}`
    : request
      ? `Approve plan request from ${company.companyName}`
    : extend
      ? `Extend ${current?.planName} for ${company.companyName}`
      : current?.planKey
        ? `Change plan of ${company.companyName}`
        : `Assign a plan to ${company.companyName}`;

  return (
    <Modal
      open={open}
      title={title}
      okText={approve || request ? "Approve" : extend ? "Extend" : "Save plan"}
      okButtonProps={{ loading: saving }}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      width={520}
    >
      {approve && <p className="muted" style={{ marginTop: 0 }}>The company starts on this plan as soon as it is approved.</p>}
      {approve && company?.requestedPlan?.name && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Picked when registering: ${requestedPlanText(company.requestedPlan)}`}
          description={
            !askedAvailable
              ? `${company.requestedPlan.name} is no longer offered, so the trial is selected. Pick another plan if you agreed one with them.`
              : company.requestedPlan.contactSales
                ? "They asked to be contacted for custom pricing. Agree the price first, then pick the plan."
                : "Selected below. Change it if you agreed something else with them."
          }
        />
      )}
      {request && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`They asked: ${planRequestText(request)}`}
          description={
            <>
              {request.startWhen === "afterCurrent" ? "To start after the current plan ends." : "To start as soon as it is approved."}
              {request.note && <div>Note: {request.note}</div>}
              <div className="muted">Filled in below. Change it if you agreed something else with them. The company admin gets an email.</div>
            </>
          }
        />
      )}
      {extend && current && (
        <p className="muted" style={{ marginTop: 0 }}>
          {current.state === "expired" || current.state === "grace"
            ? "The plan has ended, so the new period starts today."
            : `The new period starts after ${formatDay(current.endsAt)}.`}
        </p>
      )}
      <Form form={form} layout="vertical" onFinish={extend ? confirmExtend : save}>
        {!extend && (
          <Form.Item name="planId" label="Plan" rules={[{ required: true, message: "Pick a plan" }]}>
            <Select
              options={plans.map((p) => {
                const lower = onNow && (p.sortOrder ?? 0) < (onNow.sortOrder ?? 0);
                return {
                  value: p._id,
                  disabled: lower,
                  label: `${p.name}${p.key === "trial" ? ` (${p.trialDays} days free)` : p.priceMonthly ? ` · ${rupees(p.priceMonthly)}/month` : ""}${lower ? " · lower than current" : ""}`,
                };
              })}
            />
          </Form.Item>
        )}
        {(overLimits.length > 0 || lostFeatures.length > 0) && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${chosen.name} is smaller than what ${company.companyName} uses now`}
            description={
              <>
                {overLimits.map((t) => (
                  <div key={t}>{t}. They cannot add more until they are under the limit.</div>
                ))}
                {lostFeatures.length > 0 && <div>Turns off: {lostFeatures.join(", ")}.</div>}
              </>
            }
          />
        )}
        {isTrial && !extend ? (
          <Alert type="info" showIcon message={`The trial runs for ${chosen.trialDays} days.`} style={{ marginBottom: 16 }} />
        ) : (
          <Space size={12} wrap style={{ width: "100%" }}>
            {!extend && (
              <Form.Item name="startDate" label="Starts" style={{ minWidth: 150 }} rules={[{ required: true, message: "Pick a start date" }]}>
                <DatePicker format="D MMM YYYY" allowClear={false} />
              </Form.Item>
            )}
            <Form.Item name="duration" label="For" style={{ minWidth: 150 }} rules={[{ required: true, message: "Pick how long" }]}>
              <Select options={DURATIONS} />
            </Form.Item>
            {duration === "custom" && (
              <Form.Item name="endDate" label="Until" rules={[{ required: true, message: "Pick the last day" }]}>
                <DatePicker format="D MMM YYYY" disabledDate={(d) => d.isBefore(dayjs(), "day")} />
              </Form.Item>
            )}
          </Space>
        )}
        {!isTrial && (
          <Space size={12} wrap style={{ width: "100%" }}>
            <Form.Item name={["payment", "mode"]} label="Payment" style={{ minWidth: 150 }}>
              <Select allowClear placeholder="How they paid" options={PAYMENT_MODES} />
            </Form.Item>
            <Form.Item name={["payment", "reference"]} label="Reference no.">
              <Input placeholder="UTR / cheque no." maxLength={80} />
            </Form.Item>
            <Form.Item name={["payment", "amount"]} label="Amount (₹)">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
        )}
        <Form.Item name="note" label="Note" style={{ marginBottom: error ? 12 : 0 }}>
          <Input.TextArea rows={2} maxLength={300} placeholder="Only the E-Gate team sees this" />
        </Form.Item>
      </Form>
      {error && <Alert type="error" message={error} showIcon />}
    </Modal>
  );
};

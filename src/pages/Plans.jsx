import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Skeleton, Space, Switch, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import api, { errorMessage } from "../api";
import { limitText, rupees } from "../components/plan";

// Plans: what each plan includes and its limits. Companies already on a plan keep what they
// bought until they renew or change plan.
const Plans = () => {
  const { message, modal } = App.useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // plan, or {} for a new one
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      setData(await api.plans());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (plan) => {
    const limits = Object.fromEntries(
      Object.keys(data.names.limits).map((k) => [k, { value: plan.limits?.[k] === -1 ? null : plan.limits?.[k] ?? 0, unlimited: plan.limits?.[k] === -1 }])
    );
    form.setFieldsValue({
      name: plan.name || "",
      description: plan.description || "",
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      trialDays: plan.trialDays || 0,
      isActive: plan.isActive !== false,
      sortOrder: plan.sortOrder ?? data.plans.length + 1,
      features: plan.features || {},
      limits,
    });
    setEditing(plan);
  };

  const save = async (values) => {
    setSaving(true);
    try {
      await api.savePlan({
        _id: editing._id,
        ...values,
        limits: Object.fromEntries(Object.entries(values.limits).map(([k, l]) => [k, l.unlimited ? -1 : l.value ?? 0])),
      });
      message.success(editing._id ? "Plan saved" : "Plan created");
      setEditing(null);
      load();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Only a plan no company is on can go; the server checks again
  const remove = (p) =>
    modal.confirm({
      title: `Delete the ${p.name} plan?`,
      content: "It is removed for good. Companies that had it in the past keep their history.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deletePlan(p._id);
          message.success(`${p.name} deleted`);
          load();
        } catch (err) {
          message.error(errorMessage(err));
          load();
        }
      },
    });

  if (error && !data) return <Alert type="error" message={error} showIcon />;

  const isTrial = editing?.key === "trial";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Plans</h1>
          <p>What each plan includes. Changes apply when a company gets, renews or changes a plan.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open({})} disabled={!data}>
          New plan
        </Button>
      </div>

      {!data ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {data.plans.map((p) => (
            <Col xs={24} md={12} xl={6} key={p._id}>
              <Card className={`panel plan-card ${p.isActive ? "" : "is-off"}`}>
                <div className="plan-card-head">
                  <div>
                    <div className="plan-card-name">
                      {p.name} {!p.isActive && <Tag bordered={false}>Off</Tag>}
                    </div>
                    <div className="muted">{p.description || " "}</div>
                  </div>
                  <Space size={0}>
                    <Button type="text" icon={<EditOutlined />} onClick={() => open(p)} aria-label={`Edit ${p.name}`} />
                    <Tooltip title={p.deleteBlock || "Delete this plan"}>
                      {/* span: a disabled button shows no tooltip of its own */}
                      <span>
                        <Button type="text" danger icon={<DeleteOutlined />} disabled={!!p.deleteBlock} onClick={() => remove(p)} aria-label={`Delete ${p.name}`} />
                      </span>
                    </Tooltip>
                  </Space>
                </div>
                <div className="plan-card-price">
                  {p.key === "trial" ? (
                    <>
                      <b>Free</b> <span className="muted">for {p.trialDays} days</span>
                    </>
                  ) : (
                    <>
                      <b>{rupees(p.priceMonthly)}</b> <span className="muted">/ month</span>
                      {p.priceYearly > 0 && <div className="muted">{rupees(p.priceYearly)} / year</div>}
                    </>
                  )}
                </div>
                <ul className="plan-card-limits">
                  {Object.entries(data.names.limits).map(([k, label]) => (
                    <li key={k}>
                      <span>{label}</span>
                      <b>{limitText(p.limits[k])}</b>
                    </li>
                  ))}
                </ul>
                <ul className="plan-card-features">
                  {Object.entries(data.names.features).map(([k, label]) => (
                    <li key={k} className={p.features[k] ? "" : "is-off"}>
                      {p.features[k] ? "✓" : "✕"} {label}
                    </li>
                  ))}
                </ul>
                <div className="muted plan-card-foot">
                  {p.companies} compan{p.companies === 1 ? "y" : "ies"} on this plan
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        open={!!editing}
        title={editing?._id ? `Edit ${editing.name}` : "New plan"}
        okText="Save plan"
        okButtonProps={{ loading: saving }}
        onOk={() => form.submit()}
        onCancel={() => setEditing(null)}
        width={680}
        destroyOnClose
      >
        {editing?._id && editing.companies > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${editing.companies} compan${editing.companies === 1 ? "y keeps" : "ies keep"} the current version until they renew or change plan.`}
          />
        )}
        <Form form={form} layout="vertical" onFinish={save}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Give the plan a name" }]}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="description" label="One line about it">
                <Input maxLength={160} />
              </Form.Item>
            </Col>
            {isTrial ? (
              <Col xs={12} sm={8}>
                <Form.Item name="trialDays" label="Trial days" rules={[{ required: true, message: "How many days?" }]}>
                  <InputNumber min={1} max={90} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            ) : (
              <>
                <Col xs={12} sm={8}>
                  <Form.Item name="priceMonthly" label="Price a month (₹)">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item name="priceYearly" label="Price a year (₹)">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col xs={12} sm={4}>
              <Form.Item name="sortOrder" label="Order">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Item name="isActive" label="On" valuePropName="checked">
                <Switch disabled={isTrial} />
              </Form.Item>
            </Col>
          </Row>

          <h4 className="plan-form-title">Limits</h4>
          <Row gutter={12}>
            {data &&
              Object.entries(data.names.limits).map(([k, label]) => (
                <Col xs={12} sm={6} key={k}>
                  <Form.Item label={label} required style={{ marginBottom: 4 }} shouldUpdate>
                    {() => (
                      <Form.Item
                        name={["limits", k, "value"]}
                        noStyle
                        rules={[
                          {
                            validator: (_, value) =>
                              form.getFieldValue(["limits", k, "unlimited"]) || (value !== null && value !== undefined)
                                ? Promise.resolve()
                                : Promise.reject(new Error(`${label}: a number or Unlimited`)),
                          },
                        ]}
                      >
                        <InputNumber min={0} style={{ width: "100%" }} disabled={form.getFieldValue(["limits", k, "unlimited"])} />
                      </Form.Item>
                    )}
                  </Form.Item>
                  <Form.Item name={["limits", k, "unlimited"]} valuePropName="checked" style={{ marginBottom: 12 }}>
                    <Checkbox>Unlimited</Checkbox>
                  </Form.Item>
                </Col>
              ))}
          </Row>

          <h4 className="plan-form-title">Features</h4>
          <div className="plan-form-features">
            {data &&
              Object.entries(data.names.features).map(([k, label]) => (
                <Form.Item key={k} name={["features", k]} valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Checkbox>{label}</Checkbox>
                </Form.Item>
              ))}
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default Plans;

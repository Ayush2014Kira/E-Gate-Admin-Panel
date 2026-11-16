import { useState } from "react";
import { App, Button, Card, Form, Input } from "antd";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";

const Account = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onFinish = async ({ currentPassword, newPassword }) => {
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      message.success("Password changed");
      form.resetFields();
      navigate("/");
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    // Heading and form together in the middle of the page
    <div style={{ maxWidth: 480, margin: "24px auto 0" }}>
      <div className="page-header" style={{ justifyContent: "center", textAlign: "center" }}>
        <div>
          <h1>Change password</h1>
        </div>
      </div>
      <Card className="panel">
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: "Required" }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[{ required: true, min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm new password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || value === getFieldValue("newPassword")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Passwords do not match")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            Change password
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Account;

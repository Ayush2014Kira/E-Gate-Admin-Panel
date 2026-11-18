import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api, { errorMessage } from "../api";
import { useAuth } from "../auth";

const Admins = () => {
  const { admin: me } = useAuth();
  const { message } = App.useApp();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  // The admin being edited (null when the edit popup is closed)
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAdmins(await api.admins());
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

  const create = async (values) => {
    setSaving(true);
    try {
      await api.createAdmin(values);
      message.success(`${values.email} can now log in to the Admin Panel`);
      setAdding(false);
      load();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const update = async (values) => {
    setSaving(true);
    try {
      const body = { name: values.name, email: values.email };
      if (values.password) body.password = values.password;
      await api.updateAdmin(editing._id, body);
      message.success(`${values.email} updated`);
      setEditing(null);
      load();
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (admin) => {
    try {
      await api.deleteAdmin(admin._id);
      message.success(`${admin.email} can no longer log in`);
      load();
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const toggle = async (admin, isActive) => {
    try {
      await api.setAdminActive(admin._id, isActive);
      message.success(isActive ? `${admin.email} enabled` : `${admin.email} disabled`);
      load();
    } catch (err) {
      message.error(errorMessage(err));
    }
  };

  const columns = [
    {
      title: "Name",
      render: (_, a) => (
        <>
          <div style={{ fontWeight: 600 }}>
            {a.name || "—"} {a._id === me._id && <Tag color="blue">You</Tag>}
            {a.fromEnv && <Tag>Main login</Tag>}
          </div>
          <div className="muted">{a.email}</div>
        </>
      ),
    },
    {
      title: "Last login",
      dataIndex: "lastLoginAt",
      responsive: ["sm"],
      render: (value) => (value ? dayjs(value).format("DD MMM YYYY, h:mm A") : "Never"),
    },
    {
      title: "Active",
      dataIndex: "isActive",
      align: "right",
      render: (value, a) => (
        <Switch checked={value} disabled={a._id === me._id} onChange={(checked) => toggle(a, checked)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, a) => {
        const blocked = a._id === me._id ? "You cannot delete yourself" : a.fromEnv ? "The main login comes from the server settings" : "";
        return (
          <Space size={6}>
            <Tooltip title="Edit">
              <Button icon={<EditOutlined />} aria-label={`Edit ${a.email}`} onClick={() => setEditing(a)} />
            </Tooltip>
            {blocked ? (
              <Tooltip title={blocked}>
                <Button danger icon={<DeleteOutlined />} aria-label={`Delete ${a.email}`} disabled />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Delete this admin?"
                description={`${a.email} will no longer be able to log in.`}
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(a)}
              >
                {/* No tooltip here: it would sit on top of the confirm box's Delete button */}
                <Button danger icon={<DeleteOutlined />} aria-label={`Delete ${a.email}`} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Admin users</h1>
          <p>People who can log in to this Admin Panel</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setAdding(true);
          }}
        >
          Add admin
        </Button>
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card className="panel" styles={{ body: { padding: 0 } }}>
        <Table className="admins-table" rowKey="_id" columns={columns} dataSource={admins} loading={loading} pagination={false} />
      </Card>

      <Modal
        open={adding}
        title="Add admin"
        okText="Add admin"
        okButtonProps={{ loading: saving }}
        onCancel={() => setAdding(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={create} requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            extra="Share it with them privately; they can change it after logging in."
            rules={[{ required: true, min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!editing}
        title="Edit admin"
        okText="Save"
        okButtonProps={{ loading: saving }}
        onCancel={() => setEditing(null)}
        onOk={() => editForm.submit()}
        destroyOnHidden
      >
        <Form
          key={editing?._id}
          form={editForm}
          layout="vertical"
          onFinish={update}
          requiredMark={false}
          preserve={false}
          initialValues={{ name: editing?.name, email: editing?.email }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            extra={editing?.fromEnv ? "The main login's email is set in the server settings (.env)." : undefined}
            rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
          >
            <Input autoComplete="off" disabled={editing?.fromEnv} />
          </Form.Item>
          {/* Your own password: Account page (asks for the current one). Main login: .env */}
          {editing && editing._id !== me._id && !editing.fromEnv && (
            <Form.Item
              name="password"
              label="New password"
              extra="Leave empty to keep the current password."
              rules={[{ min: 8, message: "At least 8 characters" }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default Admins;

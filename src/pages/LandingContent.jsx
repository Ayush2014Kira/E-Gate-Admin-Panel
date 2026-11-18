import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Drawer, Dropdown, Empty, Grid, Input, Select, Segmented, Skeleton, Switch, Tooltip } from "antd";
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  CrownOutlined,
  DeleteOutlined,
  DollarOutlined,
  DesktopOutlined,
  DownOutlined,
  ExportOutlined,
  EyeOutlined,
  FileProtectOutlined,
  FlagOutlined,
  FormOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  KeyOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  MoreOutlined,
  OrderedListOutlined,
  PlusOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  SendOutlined,
  ShopOutlined,
  SmileOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import api, { errorMessage } from "../api";

// Landing page editor: the texts and lists of the public home page (VMS "/"). The layout stays in
// the VMS code. Sections on the left, the form in the middle, the real page on the right (it updates
// while you type). Save draft keeps the changes here; Publish makes them live.
// Limits match E-Gate-Backend/src/utils/siteContent.js (the server cleans and cuts everything again).

const VMS_URL = (import.meta.env.VITE_VMS_URL || `${window.location.origin}/eGate/`).trim();
const PREVIEW_URL = `${VMS_URL}${VMS_URL.includes("?") ? "&" : "?"}preview=1`;
const VMS_ORIGIN = (() => {
  try {
    return new URL(VMS_URL).origin;
  } catch {
    return window.location.origin;
  }
})();

// Same names as the VMS page (src/Pages/Home/homeIcons.jsx)
const ICONS = {
  QrcodeOutlined, ScanOutlined, FormOutlined, IdcardOutlined, MobileOutlined, ThunderboltOutlined,
  LockOutlined, LineChartOutlined, BarChartOutlined, SendOutlined, AuditOutlined,
  SafetyCertificateOutlined, FileProtectOutlined, TeamOutlined, UserOutlined, ToolOutlined,
  KeyOutlined, CrownOutlined, CarOutlined, BellOutlined, CalendarOutlined, ClockCircleOutlined,
  GlobalOutlined, HomeOutlined, ShopOutlined, MailOutlined, SmileOutlined, CloudOutlined,
};
const iconLabel = (name) => name.replace(/Outlined$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");

// ---------- what can be edited ----------
const text = (key, label, max, opts = {}) => ({ type: "text", key, label, max, ...opts });
const area = (key, label, max, opts = {}) => text(key, label, max, { area: true, ...opts });
const points = (key, label, maxItems, max, addLabel = "Add line") => ({ type: "strings", key, label, maxItems, max, addLabel });
const items = (key, label, maxItems, fields, newItem, noun) => ({ type: "items", key, label, maxItems, fields, newItem, noun });
const planPick = (key, label, multiple, hint) => ({ type: "plans", key, label, multiple, hint });

const cardFields = [{ type: "icon", key: "icon", label: "Icon" }, text("title", "Title", 60), area("text", "Text", 240)];
const newCard = { icon: "QrcodeOutlined", title: "", text: "" };
const headFields = (withNav = true) => [
  text("eyebrow", "Small label", 60, { hint: "Shown above the heading" }),
  ...(withNav ? [text("navLabel", "Menu label", 30, { hint: "Top menu and footer link" })] : []),
  text("title", "Heading", 120, { wide: true }),
  area("text", "Text under the heading", 300),
];

const SECTIONS = [
  {
    key: "hero",
    label: "Hero",
    icon: <StarOutlined />,
    about: "The first thing visitors see: heading, buttons and the sample pass.",
    groups: [
      {
        path: "hero",
        title: "Heading and buttons",
        fields: [
          text("badge", "Badge", 60, { wide: true }),
          text("titleLead", "Heading, first part", 80),
          text("titleHighlight", "Heading, coloured part", 80),
          area("subtitle", "Text under the heading", 400),
          text("primaryCta", "Main button", 40, { hint: "Opens Register" }),
          text("secondaryCta", "Second button", 40, { hint: "Opens Login" }),
          points("points", "Ticks under the buttons", 4, 40, "Add tick"),
        ],
      },
      {
        path: "heroPass",
        title: "Sample pass",
        about: "The pass card on the right. Its QR code is only a picture.",
        fields: [
          text("tag", "Tag", 30), text("title", "Title", 40), text("subtitle", "Subtitle", 60), text("hint", "Text under the QR", 60),
          text("validLabel", "Validity label", 20), text("validValue", "Validity", 40), text("idLabel", "Pass ID label", 20),
          text("idValue", "Pass ID", 20), text("footer", "Bottom line", 40, { wide: true }),
        ],
      },
    ],
  },
  { key: "highlights", label: "Highlights", icon: <ThunderboltOutlined />, toggle: true, about: "The strip of short points under the hero.", groups: [{ path: "highlights", fields: [items("items", "Points", 6, cardFields, newCard, "point")] }] },
  { key: "steps", label: "How it works", icon: <OrderedListOutlined />, toggle: true, about: "Numbered steps, in this order.", groups: [{ path: "steps", fields: [...headFields(), items("items", "Steps", 6, cardFields, newCard, "step")] }] },
  { key: "features", label: "Features", icon: <AppstoreOutlined />, toggle: true, about: "Feature cards in a grid.", groups: [{ path: "features", fields: [...headFields(), items("items", "Feature cards", 12, cardFields, newCard, "feature")] }] },
  {
    key: "passTypes",
    label: "Pass types",
    icon: <IdcardOutlined />,
    toggle: true,
    about: "Kinds of visitor pass, with a button to register.",
    groups: [{ path: "passTypes", fields: [...headFields(), text("buttonLabel", "Button", 40, { hint: "Opens Register" }), items("items", "Pass types", 10, cardFields, newCard, "pass type")] }],
  },
  {
    key: "roles",
    label: "Roles",
    icon: <TeamOutlined />,
    toggle: true,
    about: "Who does what, on the dark band.",
    groups: [{
      path: "roles",
      fields: [
        ...headFields(false),
        items("items", "Roles", 6, [{ type: "icon", key: "icon", label: "Icon" }, text("title", "Title", 60), points("points", "Points", 6, 120, "Add point")], { icon: "UserOutlined", title: "", points: [] }, "role"),
      ],
    }],
  },
  {
    key: "pricing",
    label: "Pricing",
    icon: <DollarOutlined />,
    toggle: true,
    about: "Plan cards with prices. Prices, limits and features come from the Plans page.",
    note: true,
    groups: [
      { path: "pricing", title: "Texts", fields: [...headFields(), area("note", "Small print under the cards", 200)] },
      {
        path: "pricing",
        title: "Plans on the page",
        about: "Turned-off plans (Plans page) never show.",
        fields: [
          planPick("popularPlan", "Most popular plan", false, "Gets a highlighted card"),
          planPick("hiddenPlans", "Hide these plans", true, "Not shown on the page"),
          planPick("contactPlans", "Ask to contact instead of a price", true, "Shows \"Custom\" and a contact button"),
          text("contactLabel", "Contact button", 30),
          text("contactEmail", "Contact email", 120, { hint: "Empty: the button opens Register" }),
        ],
      },
    ],
  },
  {
    key: "faq",
    label: "FAQ",
    icon: <QuestionCircleOutlined />,
    toggle: true,
    about: "Questions and answers. Search engines read these too.",
    groups: [{ path: "faq", fields: [...headFields(), items("items", "Questions", 20, [text("question", "Question", 200, { wide: true }), area("answer", "Answer", 1000)], { question: "", answer: "" }, "question")] }],
  },
  {
    key: "cta",
    label: "Bottom & footer",
    icon: <FlagOutlined />,
    toggle: true,
    toggleLabel: "Show the call-to-action box",
    about: "The last call-to-action box and the footer.",
    groups: [
      { path: "cta", title: "Call-to-action box", fields: [text("title", "Heading", 120, { wide: true }), area("text", "Text", 300), text("primaryCta", "Main button", 40, { hint: "Opens Register" }), text("secondaryCta", "Second button", 40, { hint: "Opens Login" })] },
      { path: "footer", title: "Footer", fields: [area("about", "About E-Gate", 300), text("whyTitle", "Ticks heading", 40, { wide: true }), points("points", "Ticks", 5, 60, "Add tick")] },
    ],
  },
];

const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sectionPaths = (s) => s.groups.map((g) => g.path);
const moved = (list, index, dir) => {
  const next = [...list];
  const [row] = next.splice(index, 1);
  next.splice(index + dir, 0, row);
  return next;
};

// ---------- fields ----------
const FieldHead = ({ label, hint, count, max }) => (
  <div className="le-field-head">
    <label>
      {label}
      {hint && <span className="le-hint">{hint}</span>}
    </label>
    {max !== undefined && <span className={`le-count ${count > max * 0.9 ? "is-near" : ""}`}>{count}/{max}</span>}
  </div>
);

const TextField = ({ field, value, onChange }) => {
  const Comp = field.area ? Input.TextArea : Input;
  return (
    <div className={`le-field ${field.area || field.wide ? "is-wide" : ""}`}>
      <FieldHead label={field.label} hint={field.hint} count={(value || "").length} max={field.max} />
      <Comp value={value} maxLength={field.max} autoSize={field.area ? { minRows: 2, maxRows: 8 } : undefined} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};

const RowTools = ({ index, count, onMove, onRemove }) => (
  <div className="le-tools" onClick={(e) => e.stopPropagation()}>
    <Tooltip title="Move up"><Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move up" /></Tooltip>
    <Tooltip title="Move down"><Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label="Move down" /></Tooltip>
    <Tooltip title="Remove"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(index)} aria-label="Remove" /></Tooltip>
  </div>
);

const StringsField = ({ field, value = [], onChange }) => (
  <div className="le-field is-wide">
    <FieldHead label={field.label} count={value.length} max={field.maxItems} />
    <div className="le-lines">
      {value.map((v, i) => (
        <div key={i} className="le-line">
          <Input value={v} maxLength={field.max} placeholder="Type a short line" onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <RowTools index={i} count={value.length} onMove={(idx, dir) => onChange(moved(value, idx, dir))} onRemove={(idx) => onChange(value.filter((_, j) => j !== idx))} />
        </div>
      ))}
      {value.length < field.maxItems && (
        <button type="button" className="le-add is-small" onClick={() => onChange([...value, ""])}>
          <PlusOutlined /> {field.addLabel}
        </button>
      )}
    </div>
  </div>
);

const IconField = ({ field, value, icons, onChange }) => (
  <div className="le-field">
    <FieldHead label={field.label} />
    <Select
      value={value}
      showSearch
      optionFilterProp="search"
      popupMatchSelectWidth={false}
      options={icons.map((name) => {
        const Icon = ICONS[name] || QrcodeOutlined;
        return { value: name, search: iconLabel(name), label: <span className="le-icon-opt"><Icon /> {iconLabel(name)}</span> };
      })}
      onChange={onChange}
    />
  </div>
);

const ItemsField = ({ field, value = [], icons, onChange }) => {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (i) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });
  const add = () => {
    onChange([...value, clone(field.newItem)]);
    setOpen((s) => new Set(s).add(value.length));
  };
  // Indexes shift on move / remove: keep the open rows with their items
  const move = (i, dir) => {
    onChange(moved(value, i, dir));
    setOpen((s) => new Set([...s].map((x) => (x === i ? i + dir : x === i + dir ? i : x))));
  };
  const remove = (i) => {
    onChange(value.filter((_, j) => j !== i));
    setOpen((s) => new Set([...s].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))));
  };

  return (
    <div className="le-field is-wide">
      <FieldHead label={field.label} count={value.length} max={field.maxItems} />
      {value.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing here yet, so this part stays hidden" />}
      <div className="le-items">
        {value.map((item, i) => {
          const Icon = item.icon ? ICONS[item.icon] || QrcodeOutlined : null;
          const title = item.title || item.question;
          const isOpen = open.has(i);
          return (
            <div key={i} className={`le-item ${isOpen ? "is-open" : ""}`}>
              <div className="le-item-head" role="button" tabIndex={0} onClick={() => toggle(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(i)}>
                <span className="le-item-num">{i + 1}</span>
                {Icon && <span className="le-item-icon"><Icon /></span>}
                <span className={`le-item-title ${title ? "" : "is-empty"}`}>{title || `New ${field.noun}`}</span>
                <RowTools index={i} count={value.length} onMove={move} onRemove={remove} />
                <span className="le-item-caret">{isOpen ? <DownOutlined /> : <RightOutlined />}</span>
              </div>
              {isOpen && (
                <div className="le-item-body le-fields">
                  {field.fields.map((f) => (
                    <Field key={f.key} field={f} value={item[f.key]} icons={icons} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {value.length < field.maxItems && (
        <button type="button" className="le-add" onClick={add}>
          <PlusOutlined /> Add {field.noun}
        </button>
      )}
    </div>
  );
};

const PlanField = ({ field, value, plans, onChange }) => (
  <div className={`le-field ${field.multiple ? "is-wide" : ""}`}>
    <FieldHead label={field.label} hint={field.hint} />
    <Select
      mode={field.multiple ? "multiple" : undefined}
      allowClear
      value={field.multiple ? value || [] : value || undefined}
      placeholder={field.multiple ? "None" : "No highlighted plan"}
      options={plans.map((p) => ({ value: p.key, label: p.isActive ? p.name : `${p.name} (turned off)` }))}
      onChange={(v) => onChange(field.multiple ? v || [] : v || "")}
      style={{ width: "100%" }}
    />
  </div>
);

const Field = ({ field, value, icons, plans, onChange }) => {
  if (field.type === "plans") return <PlanField field={field} value={value} plans={plans || []} onChange={onChange} />;
  if (field.type === "strings") return <StringsField field={field} value={value} onChange={onChange} />;
  if (field.type === "items") return <ItemsField field={field} value={value} icons={icons} onChange={onChange} />;
  if (field.type === "icon") return <IconField field={field} value={value} icons={icons} onChange={onChange} />;
  return <TextField field={field} value={value} onChange={onChange} />;
};

// ---------- live preview ----------
const DEVICES = { desktop: 1280, mobile: 390 };

const Preview = ({ frameRef, device, setDevice, onLoad }) => {
  const boxRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = DEVICES[device];
  const scale = size.w ? Math.min(1, size.w / width) : 0.35;

  return (
    <div className="le-preview-card">
      <div className="le-preview-bar">
        <span className="le-preview-title"><span className="le-live-dot" /> Live preview</span>
        <Segmented
          size="small"
          value={device}
          onChange={setDevice}
          options={[
            { value: "desktop", icon: <DesktopOutlined />, title: "Desktop" },
            { value: "mobile", icon: <MobileOutlined />, title: "Phone" },
          ]}
        />
        <Tooltip title="Open the preview in a new tab">
          <Button size="small" type="text" icon={<ExportOutlined />} href={PREVIEW_URL} target="_blank" rel="noopener" aria-label="Open preview in a new tab" />
        </Tooltip>
      </div>
      <div className="le-preview-box" ref={boxRef}>
        <div className="le-preview-stage" style={{ width: width * scale, height: size.h || 600 }}>
          <iframe
            ref={frameRef}
            title="Landing page preview"
            src={PREVIEW_URL}
            onLoad={onLoad}
            style={{ width, height: (size.h || 600) / scale, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <p className="le-preview-note">Shows your unsaved changes. Visitors see them only after you publish.</p>
    </div>
  );
};

// ---------- page ----------
const LandingContent = () => {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const wide = !!screens.xl;
  const [state, setState] = useState(null); // server state: { draft, published, publishedAt, icons, ... }
  const [content, setContent] = useState(null); // what is being edited
  const [active, setActive] = useState("hero");
  const [device, setDevice] = useState("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const frameRef = useRef(null);
  const tabRef = useRef(null);

  const apply = (next) => {
    setState(next);
    setContent(clone(next.draft));
  };

  const load = useCallback(async () => {
    try {
      apply(await api.siteContent());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!state && !!content && !same(content, state.draft);
  const live = state ? state.published || state.defaults : null;

  // Leaving with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Send the content being edited to the preview frame (and a preview tab opened from here)
  const latest = useRef({});
  latest.current = { content, active };
  const send = useCallback((target) => {
    if (!target || !latest.current.content) return;
    target.postMessage({ type: "egate:landing-preview", content: latest.current.content, focus: latest.current.active }, VMS_ORIGIN);
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== "egate:landing-preview-ready") return;
      if (event.source === frameRef.current?.contentWindow || event.source === tabRef.current) send(event.source);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  useEffect(() => {
    const t = setTimeout(() => send(frameRef.current?.contentWindow), 200);
    return () => clearTimeout(t);
  }, [content, active, previewOpen, send]);

  const set = (path, key, value) => setContent((c) => ({ ...c, [path]: { ...c[path], [key]: value } }));

  const run = async (kind, fn, okText) => {
    setBusy(kind);
    try {
      apply(await fn());
      message.success(okText);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = () => run("save", () => api.saveSiteContent(content, false), "Draft saved");
  const publish = () =>
    modal.confirm({
      title: "Publish the landing page?",
      content: "Everyone who opens the home page will see these texts from their next page load.",
      okText: "Publish",
      onOk: () => run("publish", () => api.saveSiteContent(content, true), "Published. The landing page shows it now."),
    });
  const reset = () =>
    modal.confirm({
      title: "Start again from E-Gate's default texts?",
      content: "Your draft is replaced by the default content. The live page changes only when you publish.",
      okText: "Reset draft",
      okButtonProps: { danger: true },
      onOk: () => run("reset", () => api.resetSiteContent(), "Draft reset"),
    });

  const sectionMeta = useMemo(() => {
    if (!content || !live) return {};
    return Object.fromEntries(SECTIONS.map((s) => {
      const main = content[s.key];
      const count = Array.isArray(main?.items) ? main.items.length : null;
      const changed = sectionPaths(s).some((p) => !same(content[p], live[p]));
      const hidden = s.toggle && !main.enabled;
      return [s.key, { count, changed, hidden }];
    }));
  }, [content, live]);

  if (error) return <Alert type="error" showIcon message="Could not load the landing page content" description={error} action={<Button onClick={load}>Retry</Button>} />;
  if (!state || !content) return <Skeleton active />;

  const section = SECTIONS.find((s) => s.key === active);
  const status = dirty
    ? { cls: "is-unsaved", text: "Unsaved changes" }
    : state.hasUnpublishedChanges
      ? { cls: "is-draft", text: "Draft saved, not published" }
      : { cls: "is-live", text: "Live page is up to date" };
  const lastPublished = state.publishedAt ? `Published ${new Date(state.publishedAt).toLocaleString()}` : "Showing E-Gate's default content";

  const preview = <Preview frameRef={frameRef} device={device} setDevice={setDevice} onLoad={() => send(frameRef.current?.contentWindow)} />;

  return (
    <div className="page landing-editor">
      <div className="page-header le-header">
        <div>
          <span className="eyebrow">Website</span>
          <h1>Landing page</h1>
          <div className="le-status">
            <span className={`le-pill ${status.cls}`}>{status.text}</span>
            <span className="muted">{lastPublished}</span>
          </div>
        </div>
        <div className="le-actions">
          {!wide && (
            <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>Preview</Button>
          )}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "tab", icon: <ExportOutlined />, label: "Open preview in a new tab" },
                { key: "discard", label: "Discard unsaved changes", disabled: !dirty },
                { type: "divider" },
                { key: "reset", danger: true, label: "Reset to default texts" },
              ],
              onClick: ({ key }) => {
                if (key === "tab") tabRef.current = window.open(PREVIEW_URL, "egate-landing-preview");
                if (key === "discard") setContent(clone(state.draft));
                if (key === "reset") reset();
              },
            }}
          >
            <Button icon={<MoreOutlined />} aria-label="More actions" loading={busy === "reset"} />
          </Dropdown>
          <Button onClick={saveDraft} loading={busy === "save"} disabled={!dirty}>Save draft</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={publish} loading={busy === "publish"} disabled={!dirty && !state.hasUnpublishedChanges}>
            Publish
          </Button>
        </div>
      </div>

      <div className={`le-grid ${wide ? "has-preview" : ""}`}>
        <nav className="le-nav" aria-label="Sections">
          {SECTIONS.map((s) => {
            const meta = sectionMeta[s.key] || {};
            return (
              <button key={s.key} type="button" className={`le-nav-item ${active === s.key ? "is-active" : ""} ${meta.hidden ? "is-hidden" : ""}`} onClick={() => setActive(s.key)}>
                <span className="le-nav-icon">{s.icon}</span>
                <span className="le-nav-text">
                  <b>{s.label}</b>
                  <small>{meta.hidden ? "Hidden" : meta.count !== null && meta.count !== undefined ? `${meta.count} item${meta.count === 1 ? "" : "s"}` : "Texts"}</small>
                </span>
                {meta.changed && <Tooltip title="Different from the live page"><span className="le-changed" /></Tooltip>}
              </button>
            );
          })}
        </nav>

        <section className="le-editor" aria-label={section.label}>
          <div className="le-editor-head">
            <div>
              <h2>{section.icon} {section.label}</h2>
              <p>{section.about}</p>
            </div>
            {section.toggle && (
              <label className="le-toggle">
                <span>{section.toggleLabel || "Show on page"}</span>
                <Switch checked={content[section.key].enabled} onChange={(v) => set(section.key, "enabled", v)} />
              </label>
            )}
          </div>
          {section.toggle && !content[section.key].enabled && (
            <Alert type="warning" showIcon className="le-hidden-note" message="This section is hidden from the page. You can still edit it." />
          )}
          {section.groups.map((g) => (
            <div key={`${g.path}-${g.title || ""}`} className="le-group">
              {g.title && (
                <div className="le-group-head">
                  <h3>{g.title}</h3>
                  {g.about && <p>{g.about}</p>}
                </div>
              )}
              <div className="le-fields">
                {g.fields.map((f) => (
                  <Field key={f.key} field={f} value={content[g.path][f.key]} icons={state.icons} plans={state.plans} onChange={(v) => set(g.path, f.key, v)} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {wide && <aside className="le-preview">{preview}</aside>}
      </div>

      {!wide && (
        <Drawer title={null} placement="right" styles={{ body: { paddingTop: 44 } }} width="min(560px, 100vw)" open={previewOpen} onClose={() => setPreviewOpen(false)} destroyOnHidden>
          <div className="le-drawer-preview">{preview}</div>
        </Drawer>
      )}
    </div>
  );
};

export default LandingContent;

import { useEffect, useState } from "react";
import { logoUrl } from "../api";

// Company logo, scaled to fit inside the box without cropping (logos are often wide);
// falls back to the first letter when there is no logo or it fails to load.
export const CompanyLogo = ({ company, size = 40 }) => {
  const src = logoUrl(company.companyLogo);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const box = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: 8,
    border: "1px solid #d5dee8",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  };

  if (!src || failed) {
    return (
      <div style={{ ...box, background: "#e6f0f8", color: "#003557", fontWeight: 600, fontSize: size * 0.4 }}>
        {(company.companyName || "?").charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div style={{ ...box, background: "#fff", padding: Math.round(size * 0.08) }}>
      <img
        src={src}
        alt={company.companyName}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
};

// Logo + name (+ optional second line) of a company.
const CompanyCell = ({ company, sub, size = 40 }) => (
  <div className="company-cell">
    <CompanyLogo company={company} size={size} />
    <div style={{ minWidth: 0 }}>
      <div className="name">{company.companyName}</div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  </div>
);

export default CompanyCell;

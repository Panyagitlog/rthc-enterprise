import { useMemo, useState } from "react";
import api from "../lib/api";
import LocationSelect from "./LocationSelect";

export default function HeadCountForm() {
  const [locationId, setLocationId] = useState("");

  const [requirement, setRequirement] = useState(0);
  const [filled, setFilled] = useState(0);

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);

  const variation = useMemo(() => requirement - filled, [
    requirement,
    filled,
  ]);

  async function save() {
    if (!locationId) {
      alert("Please select location");
      return;
    }

    try {
      setLoading(true);

      await api.post("/headcount/save", {
        locationId,
        requirement,
        filled,
        variation,
        remarks,
        updatedBy: "Super Admin",
      });

      alert("Head Count Saved Successfully");

      setRequirement(0);
      setFilled(0);
      setRemarks("");
    } catch (err) {
      alert("Unable to save Head Count");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 12,
    padding: 25,
    boxShadow: "0 2px 10px rgba(0,0,0,.08)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    marginTop: 6,
    marginBottom: 15,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 15,
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ marginBottom: 20 }}>Current Head Count</h2>

      <label>Location</label>

      <LocationSelect onSelect={setLocationId} />

      <label>Requirement</label>

      <input
        type="number"
        value={requirement}
        style={inputStyle}
        onChange={(e) =>
          setRequirement(Number(e.target.value))
        }
      />

      <label>Filled</label>

      <input
        type="number"
        value={filled}
        style={inputStyle}
        onChange={(e) =>
          setFilled(Number(e.target.value))
        }
      />

      <label>Variation</label>

      <input
        readOnly
        value={variation}
        style={{
          ...inputStyle,
          background: "#f3f4f6",
          fontWeight: "bold",
        }}
      />

      <label>Remarks</label>

      <textarea
        rows={4}
        value={remarks}
        style={inputStyle}
        onChange={(e) => setRemarks(e.target.value)}
      />

      <button
        disabled={loading}
        onClick={save}
        style={{
          width: "100%",
          padding: 14,
          border: "none",
          borderRadius: 8,
          background: loading ? "#94a3b8" : "#2563eb",
          color: "white",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: 15,
        }}
      >
        {loading ? "Saving..." : "Save Head Count"}
      </button>
    </div>
  );
}
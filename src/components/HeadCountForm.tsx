import { useState } from "react";
import api from "../lib/api";
import LocationSelect from "./LocationSelect";

export default function HeadCountForm() {
  const [locationId, setLocationId] = useState("");
  const [requirement, setRequirement] = useState(0);
  const [filled, setFilled] = useState(0);

  const variation = requirement - filled;

  async function save() {
    try {
      await api.post("/headcount/save", {
        locationId,
        requirement,
        filled,
        updatedBy: "Super Admin",
      });

      alert("Saved Successfully");
    } catch (err) {
      alert("Save Failed");
    }
  }

  return (
    <div
      style={{
        marginTop: 30,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 400,
      }}
    >
      <h2>Current Head Count</h2>

      <LocationSelect onSelect={(id) => setLocationId(id)} />
      <input
        type="number"
        placeholder="Requirement"
        value={requirement}
        onChange={(e) => setRequirement(Number(e.target.value))}
      />

      <input
        type="number"
        placeholder="Filled"
        value={filled}
        onChange={(e) => setFilled(Number(e.target.value))}
      />

      <input value={variation} readOnly />

      <button onClick={save}>Save Head Count</button>
    </div>
  );
}

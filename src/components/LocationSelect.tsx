import { useEffect, useState } from "react";
import api from "../lib/api";

export default function LocationSelect({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const res = await api.get("/locations");
    setLocations(res.data);
  }

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select Location</option>

      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.company.name} | {l.state} | {l.locationName}
        </option>
      ))}
    </select>
  );
}
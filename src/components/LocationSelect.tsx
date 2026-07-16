import { useEffect, useState } from "react";
import api from "../lib/api";

interface Company {
  id: string;
  name: string;
}

interface Location {
  id: string;
  state: string;
  locationName: string;
  company: Company;
}

interface Props {
  onSelect: (id: string) => void;
}

export default function LocationSelect({ onSelect }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);

      const res = await api.get("/locations");

      setLocations(res.data);

      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load locations");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <select disabled>
        <option>Loading locations...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div
        style={{
          color: "red",
          marginBottom: 15,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <select
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #d1d5db",
        marginBottom: 15,
      }}
      defaultValue=""
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">Select Location</option>

      {locations.map((location) => (
        <option
          key={location.id}
          value={location.id}
        >
          {location.company.name}
          {" • "}
          {location.state}
          {" • "}
          {location.locationName}
        </option>
      ))}
    </select>
  );
}
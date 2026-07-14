import { useAuthStore } from "../store/authStore";
import HeadCountForm from "../components/HeadCountForm";

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div
      style={{
        background: "#f5f7fb",
        minHeight: "100vh",
        padding: 30,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "#1e40af",
          color: "white",
          padding: 20,
          borderRadius: 10,
          marginBottom: 30,
        }}
      >
        <h2>Real Time Head Count System</h2>

        <p>
          Welcome <b>{user?.fullName}</b>
        </p>

        <p>{user?.role}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h3>Companies</h3>
          <h1>1</h1>
        </div>

        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h3>Locations</h3>
          <h1>1</h1>
        </div>

        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h3>Today's Updates</h3>
          <h1>1</h1>
        </div>
      </div>

      <div
        style={{
          background: "white",
          padding: 25,
          borderRadius: 10,
        }}
      >
        <HeadCountForm />
      </div>
    </div>
  );
}
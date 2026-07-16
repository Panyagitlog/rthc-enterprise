import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import headCountRoutes from "./routes/headcount.routes";
import locationRoutes from "./routes/location.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import companyRoutes from "./routes/company.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/headcount", headCountRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/companies", companyRoutes);

export default app;
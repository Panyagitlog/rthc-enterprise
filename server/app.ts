import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import headCountRoutes from "./routes/headcount.routes";
import locationRoutes from "./routes/location.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import companyRoutes from "./routes/company.routes";
import aiChatRoutes from "./routes/ai-chat.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
	res.json({
		service: "DMCFS API",
		status: "ok",
		aiChat: "/api/ai-chat",
		supabaseReadMode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "super-admin-full-read" : "session-read",
	});
});

app.use("/api/auth", authRoutes);
app.use("/api/headcount", headCountRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/ai-chat", aiChatRoutes);

export default app;
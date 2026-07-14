import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import headCountRoutes from "./routes/headcount.routes";
import locationRoutes from "./routes/location.routes";

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/headcount", headCountRoutes);
app.use("/api/locations", locationRoutes);

export default app;
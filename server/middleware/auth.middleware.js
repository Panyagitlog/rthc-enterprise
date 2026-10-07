"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.authenticatePlatform = void 0;
const jwt_1 = require("../utils/jwt");
const authenticatePlatform = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token)
        return res.status(401).json({ message: "Authorization header missing" });
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        if (decoded.role === "SUPER_ADMIN" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            req.supabaseAccessToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
        }
        return next();
    }
    catch {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        if (!url || !anonKey)
            return res.status(401).json({ message: "Invalid or expired session" });
        try {
            const response = await fetch(`${url}/auth/v1/user`, {
                headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
            });
            if (!response.ok)
                return res.status(401).json({ message: "Invalid or expired session" });
            const user = await response.json();
            let role = user.user_metadata?.role || "";
            const profileResponse = await fetch(`${url}/rest/v1/users?select=role&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
                headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
            });
            if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                role = profiles[0]?.role || role;
            }
            req.user = { id: user.id, email: user.email || "", role };
            req.supabaseAccessToken = role === "SUPER_ADMIN" && process.env.SUPABASE_SERVICE_ROLE_KEY
                ? process.env.SUPABASE_SERVICE_ROLE_KEY
                : token;
            return next();
        }
        catch {
            return res.status(401).json({ message: "Unable to verify session" });
        }
    }
};
exports.authenticatePlatform = authenticatePlatform;
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header missing",
            });
        }
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format",
            });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token not found",
            });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map
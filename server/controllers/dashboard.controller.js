"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const getDashboard = async (req, res) => {
    try {
        const [companies, locations, employees, activeEmployees, inactiveEmployees,] = await Promise.all([
            client_1.default.company.count(),
            client_1.default.location.count(),
            client_1.default.user.count(),
            client_1.default.user.count({
                where: {
                    isActive: true,
                },
            }),
            client_1.default.user.count({
                where: {
                    isActive: false,
                },
            }),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                loggedInUser: req.user,
                companies,
                locations,
                employees,
                activeEmployees,
                inactiveEmployees,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
        });
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=dashboard.controller.js.map
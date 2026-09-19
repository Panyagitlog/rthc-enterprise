"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocations = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getLocations = async (req, res) => {
    const locations = await prisma.location.findMany({
        include: {
            company: true,
        },
        orderBy: {
            state: "asc",
        },
    });
    res.json(locations);
};
exports.getLocations = getLocations;
//# sourceMappingURL=location.controller.js.map
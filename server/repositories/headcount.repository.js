"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHeadCount = updateHeadCount;
exports.getCurrentHeadCount = getCurrentHeadCount;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function updateHeadCount(locationId, requirement, filled, updatedBy) {
    const variation = requirement - filled;
    const current = await prisma.headCountCurrent.upsert({
        where: {
            locationId,
        },
        update: {
            requirement,
            filled,
            variation,
            updatedById: updatedBy,
        },
        create: {
            locationId,
            requirement,
            filled,
            variation,
            updatedById: updatedBy,
        },
    });
    await prisma.headCountHistory.create({
        data: {
            locationId,
            requirement,
            filled,
            variation,
            updatedBy,
        },
    });
    return current;
}
async function getCurrentHeadCount() {
    return prisma.headCountCurrent.findMany({
        include: {
            location: {
                include: {
                    company: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });
}
//# sourceMappingURL=headcount.repository.js.map
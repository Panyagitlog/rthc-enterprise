"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding database...");
    // Company
    const company = await prisma.company.upsert({
        where: { code: "INF001" },
        update: {},
        create: {
            code: "INF001",
            name: "Infosys",
            status: client_1.Status.ACTIVE,
        },
    });
    // Location
    const location = await prisma.location.create({
        data: {
            companyId: company.id,
            state: "Maharashtra",
            district: "Pune",
            city: "Pune",
            locationName: "Hinjewadi",
            status: client_1.Status.ACTIVE,
        },
    });
    // Passwords
    const adminPassword = await bcrypt_1.default.hash("Admin@123", 10);
    const coordPassword = await bcrypt_1.default.hash("Coord@123", 10);
    // Admin
    await prisma.user.upsert({
        where: {
            email: "admin@rthc.com",
        },
        update: {},
        create: {
            employeeCode: "EMP001",
            fullName: "Super Admin",
            email: "admin@rthc.com",
            password: adminPassword,
            mobile: "9999999999",
            role: client_1.UserRole.SUPER_ADMIN,
            status: client_1.Status.ACTIVE,
            companyId: company.id,
        },
    });
    // Coordinator
    const coordinator = await prisma.user.upsert({
        where: {
            email: "coord@rthc.com",
        },
        update: {},
        create: {
            employeeCode: "EMP002",
            fullName: "Coordinator",
            email: "coord@rthc.com",
            password: coordPassword,
            mobile: "8888888888",
            role: client_1.UserRole.COORDINATOR,
            status: client_1.Status.ACTIVE,
            companyId: company.id,
            locationId: location.id,
        },
    });
    // HeadCount
    await prisma.headCountCurrent.create({
        data: {
            locationId: location.id,
            requirement: 100,
            filled: 72,
            variation: 28,
            updatedById: coordinator.id,
        },
    });
    console.log("✅ Seed completed successfully.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
const client_1 = __importDefault(require("../prisma/client"));
async function findUserByEmail(email) {
    return client_1.default.user.findUnique({
        where: {
            email,
        },
        include: {
            company: true,
            location: true,
        },
    });
}
//# sourceMappingURL=auth.repository.js.map
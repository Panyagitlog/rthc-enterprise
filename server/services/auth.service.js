"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_repository_1 = require("../repositories/auth.repository");
const jwt_1 = require("../utils/jwt");
async function login(email, password) {
    const user = await (0, auth_repository_1.findUserByEmail)(email);
    if (!user) {
        throw new Error("Invalid email or password");
    }
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid) {
        throw new Error("Invalid email or password");
    }
    const token = (0, jwt_1.generateToken)({
        id: user.id,
        role: user.role,
        email: user.email,
    });
    const { password: _, ...safeUser } = user;
    return {
        token,
        user: safeUser,
    };
}
//# sourceMappingURL=auth.service.js.map
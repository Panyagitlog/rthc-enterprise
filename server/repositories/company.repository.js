"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.findById = exports.findAll = exports.create = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const create = (data) => {
    return client_1.default.company.create({
        data,
    });
};
exports.create = create;
const findAll = () => {
    return client_1.default.company.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
};
exports.findAll = findAll;
const findById = (id) => {
    return client_1.default.company.findUnique({
        where: {
            id,
        },
    });
};
exports.findById = findById;
const update = (id, data) => {
    return client_1.default.company.update({
        where: {
            id,
        },
        data,
    });
};
exports.update = update;
const remove = (id) => {
    return client_1.default.company.delete({
        where: {
            id,
        },
    });
};
exports.remove = remove;
//# sourceMappingURL=company.repository.js.map
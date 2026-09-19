"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = save;
exports.current = current;
const headcount_repository_1 = require("../repositories/headcount.repository");
async function save(data) {
    const { locationId, requirement, filled, updatedBy, } = data;
    if (!locationId) {
        throw new Error("Location is required");
    }
    if (requirement < 0) {
        throw new Error("Requirement cannot be negative");
    }
    if (filled < 0) {
        throw new Error("Filled cannot be negative");
    }
    return (0, headcount_repository_1.updateHeadCount)(locationId, Number(requirement), Number(filled), updatedBy);
}
async function current() {
    return (0, headcount_repository_1.getCurrentHeadCount)();
}
//# sourceMappingURL=headcount.service.js.map
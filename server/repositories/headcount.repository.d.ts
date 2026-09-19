export declare function updateHeadCount(locationId: string, requirement: number, filled: number, updatedBy: string): Promise<{
    id: string;
    locationId: string;
    updatedAt: Date;
    requirement: number;
    filled: number;
    variation: number;
    updatedById: string | null;
}>;
export declare function getCurrentHeadCount(): Promise<({
    location: {
        company: {
            id: string;
            status: import("@prisma/client").$Enums.Status;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.Status;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
        state: string;
        district: string;
        city: string;
        locationName: string;
    };
} & {
    id: string;
    locationId: string;
    updatedAt: Date;
    requirement: number;
    filled: number;
    variation: number;
    updatedById: string | null;
})[]>;
//# sourceMappingURL=headcount.repository.d.ts.map
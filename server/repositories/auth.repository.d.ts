export declare function findUserByEmail(email: string): Promise<({
    company: {
        id: string;
        status: import("@prisma/client").$Enums.Status;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
    } | null;
    location: {
        id: string;
        status: import("@prisma/client").$Enums.Status;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
        state: string;
        district: string;
        city: string;
        locationName: string;
    } | null;
} & {
    id: string;
    employeeCode: string | null;
    email: string;
    fullName: string;
    password: string;
    mobile: string | null;
    role: import("@prisma/client").$Enums.UserRole;
    status: import("@prisma/client").$Enums.Status;
    companyId: string | null;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
//# sourceMappingURL=auth.repository.d.ts.map
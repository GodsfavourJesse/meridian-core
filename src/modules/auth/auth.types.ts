export type AuthenticatedUser = {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt: Date | null;
    status: string;
    createdAt: Date;
};

declare module "fastify" {
    interface FastifyRequest {
        user: AuthenticatedUser | null;
    }
}

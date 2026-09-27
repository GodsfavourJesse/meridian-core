import type { findUserById } from "./auth.repository";

export type AuthenticatedUser = NonNullable<
    Awaited<ReturnType<typeof findUserById>>
>;

declare module "fastify" {
    interface FastifyRequest {
        user: AuthenticatedUser | null;
    }
}

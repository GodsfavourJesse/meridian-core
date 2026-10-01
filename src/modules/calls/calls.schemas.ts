import { z } from "zod";
import { CALL_TYPE } from "../../database/constants/call.constants";

export const createCallSchema =
    z.object({
        conversationId: z
            .string()
            .uuid(),

        calleeId: z
            .string()
            .uuid(),

        type: z.enum([
            CALL_TYPE.VOICE,
            CALL_TYPE.VIDEO,
        ]),
    });

export const callIdParamsSchema =
    z.object({
        callId: z
            .string()
            .uuid(),
    });

export const listCallsQuerySchema =
    z.object({
        limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(50),
    });

export type CreateCallBody =
    z.infer<
        typeof createCallSchema
    >;

export type CallIdParams =
    z.infer<
        typeof callIdParamsSchema
    >;

export type ListCallsQuery =
    z.infer<
        typeof listCallsQuerySchema
    >;
import { z } from "zod";

export const updateMeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters"),
}).strict();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
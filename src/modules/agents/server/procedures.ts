import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { create } from "domain";
import { agentsInsertSchema } from "../schemas";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const agentsRouter = createTRPCRouter({
    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const [existingAgent] = await db
                .select()
                .from(agents)
                .where(eq(agents.id, input.id));

            return existingAgent;
        }),
    getMany: protectedProcedure.query(async () => {
        const data = await db
            .select()
            .from(agents);

        // await new Promise((resolve) => setTimeout(resolve, 5000));
        // throw new TRPCError({ code: "BAD_REQUEST" });

        return data;
    }),
    create: protectedProcedure
        .input(agentsInsertSchema)
        .mutation(async ({ input, ctx }) => {
            const [createdAgent] = await db
                .insert(agents)
                .values({
                    ...input,
                    // userId: ctx.auth.user.id,
                    userId: ctx.session.user.id,
                })
                .returning();

            return createdAgent;
        }),
});
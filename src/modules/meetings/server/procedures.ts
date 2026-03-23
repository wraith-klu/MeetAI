import { db } from "@/db";
import { meetings, agents } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, sql, count, desc, eq, getTableColumns, ilike } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/constants";
import { TRPCError } from "@trpc/server";
import { MeetingsInsertSchema, MeetingsUpdateSchema, } from "../schemas";
import { MeetingStatus } from "../types";
import { generateAvatarUri } from "@/lib/avtar";
import { streamVideo } from "@/lib/stream-video";

export const meetingsRouter = createTRPCRouter({

    generateToken: protectedProcedure.mutation(async ({ ctx }) => {
        await streamVideo.upsertUsers([
            {
                id: ctx.session.user.id,
                name: ctx.session.user.name,
                role: "admin",
                image:
                    ctx.session.user.image ??
                    generateAvatarUri({
                        seed: ctx.session.user.name,
                        variant: "initials",
                    }),
            },
        ]);
        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const issuedAt = Math.floor(Date.now() / 1000) - 60;

        const token = streamVideo.generateUserToken({
            user_id: ctx.session.user.id,
            exp: expirationTime,
            validity_in_seconds: issuedAt,
        });

        return token;
    }),
    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [removedMeeting] = await db
                .delete(meetings)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.session.user.id),
                    ),
                )
                .returning();

            if (!removedMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            return removedMeeting;
        }),
    update: protectedProcedure
        .input(MeetingsUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            const [updatedMeeting] = await db
                .update(meetings)
                .set(input)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.session.user.id),
                    ),
                )
                .returning();

            if (!updatedMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            return updatedMeeting;
        }),

    create: protectedProcedure
        .input(MeetingsInsertSchema)
        .mutation(async ({ input, ctx }) => {
            const [createdMeeting] = await db
                .insert(meetings)
                .values({
                    ...input,
                    // userId: ctx.auth.user.id,
                    userId: ctx.session.user.id,
                })
                .returning();

            // TODO: Create Stream Call, Upsert Stream Users
            const call = streamVideo.video.call("default", createdMeeting.id);

            await call.create({
                data: {
                    created_by_id: ctx.session.user.id,
                    custom: {
                        meetingId: createdMeeting.id,
                        meetingName: createdMeeting.name,
                    },
                    settings_override: {
                        transcription: {
                            language: "en",
                            mode: "auto-on",
                            closed_caption_mode: "auto-on",
                        },
                        recording: {
                            mode: "auto-on",
                            quality: "1080p",
                        },
                    },
                },
            });

            const [existingAgent] = await db
                .select()
                .from(agents)
                .where(eq(agents.id, createdMeeting.agentId));

            if (!existingAgent) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Agent not found",
                });
            }

            await streamVideo.upsertUsers([
                {
                    id: existingAgent.id,
                    name: existingAgent.name,
                    role: "user",
                    image: generateAvatarUri({
                        seed: existingAgent.name,
                        variant: "botttsNeutral",
                    }),
                },
            ]);

            return createdMeeting;
        }),


    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const [existingMeeting] = await db
                .select({
                    ...getTableColumns(meetings),
                    agent: agents,
                    duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
                })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.session.user.id),
                    )
                );

            if (!existingMeeting) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
            }

            return existingMeeting;
        }),
    getMany: protectedProcedure
        .input(
            z.object({
                page: z.number().default(DEFAULT_PAGE),
                pageSize: z
                    .number()
                    .min(MIN_PAGE_SIZE)
                    .max(MAX_PAGE_SIZE)
                    .default(DEFAULT_PAGE_SIZE),
                search: z.string().nullish(),
                agentId: z.string().nullish(),
                status: z
                    .enum([
                        MeetingStatus.Upcoming,
                        MeetingStatus.Active,
                        MeetingStatus.Completed,
                        MeetingStatus.Processing,
                        MeetingStatus.Cancelled,
                    ])
                    .nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { search, page, pageSize, agentId, status } = input;

            const data = await db
                .select({
                    ...getTableColumns(meetings),
                    agent: agents,
                    duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
                })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.session.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                )
                .orderBy(desc(meetings.createdAt), desc(meetings.id))
                .limit(pageSize)
                .offset((page - 1) * pageSize)

            const [total] = await db
                .select({ count: count() })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.session.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                );
            const totalPages = Math.ceil(total.count / pageSize);
            // await new Promise((resolve) => setTimeout(resolve, 5000));
            // throw new TRPCError({ code: "BAD_REQUEST" });

            return {
                items: data,
                total: total.count,
                totalPages,
            };
        }),
});

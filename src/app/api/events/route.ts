import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { api, checkOrigin, HttpError, jsonBody, owner } from '@/lib/http';
import { eventSchema, priceSchema } from '@/lib/validation';
import { z } from 'zod';

export const GET = () => api(async () => {
  const ownerId = await owner();
  return Response.json(await db.event.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { entries: true } } } }));
});
export const POST = (request: Request) => api(async () => {
  checkOrigin(request);
  const ownerId = await owner();
  const input = eventSchema.extend({ mode: z.enum(['LOCAL', 'ONLINE']).default('LOCAL'), startingBudget: priceSchema.default(100) }).parse(await jsonBody(request));
  const { startingBudget, ...details } = input;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const joinCode = details.mode === 'ONLINE' ? randomBytes(6).toString('hex').toUpperCase() : null;
      return Response.json(await db.event.create({ data: { ...details, joinCode, startingBudgetCents: startingBudget, ownerId } }), { status: 201 });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
  }
  throw new HttpError(503, 'Could not create a unique room code. Please try again.');
});

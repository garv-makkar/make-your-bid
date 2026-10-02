import { db } from '@/lib/db';
import { api, checkOrigin, jsonBody, owner } from '@/lib/http';
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
  return Response.json(await db.event.create({ data: { ...details, startingBudgetCents: startingBudget, ownerId } }), { status: 201 });
});

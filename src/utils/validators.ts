import { z } from "zod";
import { SearchParams } from "./types";

const searchParamsSchema = z.object({
  latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
  longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
  radius: z.string().transform(Number).pipe(z.number().positive()),
  weatherCondition: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function validateSearchParams(query: any): SearchParams {
  const result = searchParamsSchema.safeParse(query);
  if (!result.success) {
    const error = new Error('Invalid parameters');
    (error as any).status = 400;
    throw error;
  }
  return result.data;
} 
import { Request, Response } from "express";
import { LocationService } from "../../application/services/LocationService";
import { z } from "zod";

const searchParamsSchema = z.object({
  latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
  longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
  radius: z.string().transform(Number).pipe(z.number().positive()),
  weatherCondition: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  async search(req: Request, res: Response) {
    try {
      const validation = searchParamsSchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.errors });
      }

      const locations = await this.locationService.findLocations(
        validation.data
      );
      return res.json(locations);
    } catch (error) {
      console.error('Error in location search:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

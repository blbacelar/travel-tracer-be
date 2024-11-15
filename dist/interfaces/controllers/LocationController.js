"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationController = void 0;
const zod_1 = require("zod");
const searchParamsSchema = zod_1.z.object({
    latitude: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(-90).max(90)),
    longitude: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(-180).max(180)),
    radius: zod_1.z.string().transform(Number).pipe(zod_1.z.number().positive()),
    weatherCondition: zod_1.z.string().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
class LocationController {
    constructor(locationService) {
        this.locationService = locationService;
    }
    async search(req, res) {
        try {
            const validation = searchParamsSchema.safeParse(req.query);
            if (!validation.success) {
                return res.status(400).json({ errors: validation.error.errors });
            }
            const locations = await this.locationService.findLocations(validation.data);
            return res.json(locations);
        }
        catch (error) {
            console.error('Error in location search:', error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}
exports.LocationController = LocationController;

import { Router } from "express";
import { searchLocations } from "../services/locationService";
import { validateSearchParams } from "../utils/validators";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const params = validateSearchParams(req.query);
    const locations = await searchLocations(params);
    res.json(locations);
  } catch (error: any) {
    res.status(error.status || 500).json({ 
      error: error.message || "Internal server error" 
    });
  }
});

export default router; 
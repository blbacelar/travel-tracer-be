import { Router } from "express";
import { LocationController } from "../../interfaces/controllers/LocationController";
import { LocationService } from "../services/LocationService";
import { LocationRepository } from "../../infrastructure/repositories/LocationRepository";
import { OpenWeatherApi } from "../../infrastructure/api/openWeatherApi";

const router = Router();

const weatherApi = new OpenWeatherApi();
const locationRepository = new LocationRepository(weatherApi);
const locationService = new LocationService(locationRepository, weatherApi);
const locationController = new LocationController(locationService);

router.get("/search", (req, res) => locationController.search(req, res));

export default router;

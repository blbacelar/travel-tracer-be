import { Location } from '../entities/Location';

export interface ILocationRepository {
  findWithinRadius(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<Location[]>;
} 
import { LocationModel, ChildModel } from "./types.ts";

// Transforma datos de los modelos de base de datos a un formato más legible
export const fromModelToChild = (childDB: ChildModel, locationDB: LocationModel) => ({
  id: childDB._id?.toString(),
  name: childDB.name,
  behavior: childDB.behavior,
  location: {
    id: locationDB._id?.toString(),
    name: locationDB.name,
    coordinates: locationDB.coordinates,
    goodKidsCount: locationDB.goodKidsCount,
  },
});

// Calcula la distancia entre dos puntos geográficos con Haversine
export const haversine = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distancia en km
};

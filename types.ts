
import { ObjectId } from "mongodb";

// Modelo para un niño
export type ChildModel = {
  _id?: ObjectId; // ID único
  name: string; // Nombre
  behavior: "good" | "bad"; // Comportamiento
  location: ObjectId; // ID de la ubicación
};

// Modelo para una ubicación
export type LocationModel = {
  _id?: ObjectId; // ID único
  name: string; // Nombre
  coordinates: { lat: number; long: number }; // Coordenadas
  goodKidsCount: number; // Niños buenos asociados
};

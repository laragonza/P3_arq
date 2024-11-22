import { ObjectId } from "mongodb"; // Importa ObjectId desde mongodb para usar como tipo de identificador único

// Modelo de datos para un niño
export type KidModel = {
  _id?: ObjectId;
  nombre: string;
  comportamiento: "bueno" | "malo"; // Estado de comportamiento, puede ser "bueno" o "malo"
  ubicacion: ObjectId; // Referencia al ObjectId del lugar asociado
};

// Modelo de datos para un lugar
export type LugarModel = {
  _id?: ObjectId;
  nombre: string;
  coordenadas: { // Coordenadas del lugar
    lat: number; // Latitud
    long: number; // Longitud
  };
  numeroNinosBuenos: number; // Numero de niños buenos en ese lugar
};

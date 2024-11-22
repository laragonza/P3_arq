import { ObjectId } from "mongodb";

export type KidModel = {
  _id?: ObjectId;
  nombre: string;
  comportamiento: "bueno" | "malo";
  ubicacion: ObjectId; // Referencia a la colección "ubicacion"
};

export type LugarModel = {
  _id?: ObjectId;
  nombre: string;
  coordenadas: {
    lat: number; // Latitude
    long: number; // Longitude
  };
  numeroNinosBuenos: number; // Contador de niños buenos
};
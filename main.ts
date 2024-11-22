import { MongoClient, ObjectId } from "mongodb";
import { ChildModel, LocationModel } from "./types.ts";
import { haversine } from "./utils.ts";
import "https://deno.land/x/dotenv/load.ts";

// Obtiene la URL de mongodb desde las variables del entorno
const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.log("El link de mongo no existe");
  Deno.exit(1);
}

// Crea un nuevo cliente de mongodb y se conecta a la base de datos
const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Se ha conectado a la base de datos");

// Selecciona la base de datos y las colecciones que se van a utilizar
const database = client.db("santa_claus");
const childrenCollection = database.collection<ChildModel>("/ninos");
const locationsCollection = database.collection<LocationModel>("/ubicacion");

// Manejador de solicitudes http
const requestHandler = async (request: Request): Promise<Response> => {
  const urlInfo = new URL(request.url);
  const route = urlInfo.pathname;
  const httpMethod = request.method;

  // Manejo de solicitudes POST
  if (httpMethod === "POST") {
    if (route === "/ubicacion") {
      try {
        const { name, coordinates, goodKidsCount } = await request.json();

        // Validacion de datos
        if (!name || !coordinates || goodKidsCount < 0) {
          return new Response(JSON.stringify({ error: "Invalid or missing data" }), { status: 400 });
        }

        // Verifica si la ubicacion ya existe en la base de datos
        const locationExists = await locationsCollection.findOne({ name });
        if (locationExists) {
          return new Response(
            JSON.stringify({ error: "Location already exists. Names must be unique." }),
            { status: 409 }
          );
        }

        // Inserta la nueva ubicacion en la base de datos
        const newLocationId = await locationsCollection.insertOne({
          name,
          coordinates,
          goodKidsCount,
        });

        return new Response(
          JSON.stringify({ message: "Location successfully created", id: newLocationId }),
          { status: 201 }
        );
      } catch (error) {
        console.error("Error in /location:", error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
      }
    } else if (route === "/ninos") {
      try {
        const { name, behavior, locationId } = await request.json();

        // Validacion de datos
        if (!name || !behavior || !locationId || !["good", "bad"].includes(behavior)) {
          return new Response(JSON.stringify({ error: "Invalid or missing data" }), { status: 400 });
        }

        // Verifica si la ubicacion existe en la base de datos
        const location = await locationsCollection.findOne({ _id: new ObjectId(locationId) });
        if (!location) {
          return new Response(JSON.stringify({ error: "Location not found" }), { status: 404 });
        }

        // Verifica si el niño ya existe en la base de datos
        const childExists = await childrenCollection.findOne({ name });
        if (childExists) {
          return new Response(JSON.stringify({ error: "Child already exists" }), { status: 409 });
        }

        // Inserta el nuevo niño en la base de datos
        const newChildId = await childrenCollection.insertOne({
          name,
          behavior,
          location: new ObjectId(locationId),
        });

        // Si el comportamiento es "bueno", incrementa el contador de niños buenos en la ubicacion
        if (behavior === "good") {
          await locationsCollection.updateOne(
            { _id: new ObjectId(locationId) },
            { $inc: { goodKidsCount: 1 } }
          );
        }

        return new Response(
          JSON.stringify({ message: "Child successfully created", id: newChildId }),
          { status: 201 }
        );
      } catch (error) {
        console.error("Error in /children:", error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
      }
    }
  }

  // Manejo de solicitudes GET
  if (httpMethod === "GET") {
    if (route === "/ninos/good") {
      // Obtiene todo los niños con comportamiento "bueno"
      const goodChildren = await childrenCollection.find({ behavior: "good" }).toArray();
      return new Response(JSON.stringify(goodChildren), { status: 200 });
    } else if (route === "/children/bad") {
      // Obtiene todo los niños con comportamiento "malo"
      const badChildren = await childrenCollection.find({ behavior: "bad" }).toArray();
      return new Response(JSON.stringify(badChildren), { status: 200 });
    } else if (route === "/deliveries") {
      // Obtiene las ubicaciones ordenadas por el numero de niños buenos
      const sortedLocations = await locationsCollection
        .find()
        .sort({ goodKidsCount: -1 })
        .toArray();
      return new Response(JSON.stringify(sortedLocations), { status: 200 });
    } else if (route === "/route") {
      try {
        // Obtiene todas las ubicaciones ordenadas por el numero de niños buenos
        const allLocations = await locationsCollection
          .find()
          .sort({ goodKidsCount: -1 })
          .toArray();

        if (allLocations.length < 2) {
          return new Response(JSON.stringify({ totalDistance: 0 }), { status: 200 });
        }

        let totalDistance = 0;

        // Calcula la distancia total utilizando la formula de haversine
        for (let i = 0; i < allLocations.length - 1; i++) {
          const { lat: lat1, long: lon1 } = allLocations[i].coordinates;
          const { lat: lat2, long: lon2 } = allLocations[i + 1].coordinates;

          totalDistance += haversine(lat1, lon1, lat2, lon2);
        }

        return new Response(JSON.stringify({ totalDistance }), { status: 200 });
      } catch (error) {
        console.error("Error in /route:", error); // Registra el error en la consola
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
      }
    }
  }

  return new Response("Not found", { status: 404 }); // Respuesta por defecto para rutas no manejadas
};

// Inicia el servidor en el puerto 6768 y utiliza el manejador de solicitudes definido
Deno.serve({ port: 6768 }, requestHandler);

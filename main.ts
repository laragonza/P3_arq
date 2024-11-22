import { MongoClient, ObjectId } from "mongodb";
import { ChildModel, LocationModel } from "./types.ts";
import { haversine } from "./utils.ts";
import "https://deno.land/x/dotenv/load.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.log("El link de mongo no existe");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Se ha conectado a la base de datos");

const database = client.db("santa_claus");
const childrenCollection = database.collection<ChildModel>("/ninos");
const locationsCollection = database.collection<LocationModel>("/ubicacion");

const requestHandler = async (request: Request): Promise<Response> => {
  const urlInfo = new URL(request.url);
  const route = urlInfo.pathname;
  const httpMethod = request.method;

  if (httpMethod === "POST") {
    if (route === "/ubicacion") {
      try {
        const { name, coordinates, goodKidsCount } = await request.json();

        if (!name || !coordinates || goodKidsCount < 0) {
          return new Response(JSON.stringify({ error: "Invalid or missing data" }), { status: 400 });
        }

        const locationExists = await locationsCollection.findOne({ name });
        if (locationExists) {
          return new Response(
            JSON.stringify({ error: "Location already exists. Names must be unique." }),
            { status: 409 }
          );
        }

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

        if (!name || !behavior || !locationId || !["good", "bad"].includes(behavior)) {
          return new Response(JSON.stringify({ error: "Invalid or missing data" }), { status: 400 });
        }

        const location = await locationsCollection.findOne({ _id: new ObjectId(locationId) });
        if (!location) {
          return new Response(JSON.stringify({ error: "Location not found" }), { status: 404 });
        }

        const childExists = await childrenCollection.findOne({ name });
        if (childExists) {
          return new Response(JSON.stringify({ error: "Child already exists" }), { status: 409 });
        }

        const newChildId = await childrenCollection.insertOne({
          name,
          behavior,
          location: new ObjectId(locationId),
        });

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

  if (httpMethod === "GET") {
    if (route === "/ninos/good") {
      const goodChildren = await childrenCollection.find({ behavior: "good" }).toArray();
      return new Response(JSON.stringify(goodChildren), { status: 200 });
    } else if (route === "/children/bad") {
      const badChildren = await childrenCollection.find({ behavior: "bad" }).toArray();
      return new Response(JSON.stringify(badChildren), { status: 200 });
    } else if (route === "/deliveries") {
      const sortedLocations = await locationsCollection
        .find()
        .sort({ goodKidsCount: -1 })
        .toArray();
      return new Response(JSON.stringify(sortedLocations), { status: 200 });
    } else if (route === "/route") {
      try {
        const allLocations = await locationsCollection
          .find()
          .sort({ goodKidsCount: -1 })
          .toArray();

        if (allLocations.length < 2) {
          return new Response(JSON.stringify({ totalDistance: 0 }), { status: 200 });
        }

        let totalDistance = 0;

        for (let i = 0; i < allLocations.length - 1; i++) {
          const { lat: lat1, long: lon1 } = allLocations[i].coordinates;
          const { lat: lat2, long: lon2 } = allLocations[i + 1].coordinates;

          totalDistance += haversine(lat1, lon1, lat2, lon2);
        }

        return new Response(JSON.stringify({ totalDistance }), { status: 200 });
      } catch (error) {
        console.error("Error in /route:", error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
      }
    }
  }

  return new Response("Not found", { status: 404 });
};

Deno.serve({ port: 6768 }, requestHandler);
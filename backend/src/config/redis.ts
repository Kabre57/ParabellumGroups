import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

// Charger le bon fichier .env (prod ou dev)
dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env.production" : ".env" });

let client: RedisClientType;

async function initRedis() {
  if (!client) {
    const redisUrl = `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

    client = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      database: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
    });

    client.on("connect", () => {
      console.log(`✅ Connecté à Redis sur ${redisUrl}`);
    });

    client.on("error", (err) => {
      console.error("❌ Erreur Redis:", err);
    });

    await client.connect();
  }

  return client;
}

export default initRedis;

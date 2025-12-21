// MongoDB native client - replaces Prisma
import { MongoClient, Db, ObjectId } from "mongodb";

const globalForMongo = global as unknown as {
  mongoClient: MongoClient;
  db: Db;
};

function getDatabaseUrl(): string {
  // Next.js automatically loads .env, .env.local, .env.development, etc.
  // Check process.env directly
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please add it to your .env or .env.local file.\n" +
        "Example: DATABASE_URL=mongodb://localhost:27017/your-database-name\n" +
        "Or for MongoDB Atlas: DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database-name\n" +
        "Note: Make sure to restart your dev server after adding the environment variable."
    );
  }

  return databaseUrl;
}

function getDatabaseName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Remove leading slash and get database name
    return pathname.slice(1) || "test";
  } catch {
    // Fallback: try to extract from connection string
    const match = url.match(/\/([^/?]+)/);
    return match ? match[1] : "test";
  }
}

function createMongoClient(): MongoClient {
  const databaseUrl = getDatabaseUrl();

  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(databaseUrl);
  }

  return globalForMongo.mongoClient;
}

function getDb(): Db {
  if (!globalForMongo.db) {
    const client = createMongoClient();
    const databaseUrl = getDatabaseUrl();
    const dbName = getDatabaseName(databaseUrl);
    globalForMongo.db = client.db(dbName);
  }

  return globalForMongo.db;
}

// Helper to convert string ID to ObjectId
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
}

// Helper to convert ObjectId to string
export function fromObjectId(id: ObjectId | string): string {
  return typeof id === "string" ? id : id.toString();
}

// Get database instance
export function getDatabase(): Db {
  return getDb();
}

// Get MongoDB client
export function getMongoClient(): MongoClient {
  return createMongoClient();
}

// Collections
export const collections = {
  users: () => getDb().collection("User"),
  userSettings: () => getDb().collection("UserSettings"),
  rssFeeds: () => getDb().collection("RssFeed"),
  rssArticles: () => getDb().collection("RssArticle"),
  newsletters: () => getDb().collection("Newsletter"),
};

// Export ObjectId for use in queries
export { ObjectId };


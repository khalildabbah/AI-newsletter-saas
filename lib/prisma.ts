// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help

import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
  mongoClient: MongoClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please add it to your .env or .env.local file.\n" +
        "Example: DATABASE_URL=mongodb://localhost:27017/your-database-name\n" +
        "Or for MongoDB Atlas: DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database-name"
    );
  }

  // Initialize MongoClient if it doesn't exist
  let mongoClient = globalForPrisma.mongoClient;
  
  if (!mongoClient) {
    mongoClient = new MongoClient(databaseUrl);
    globalForPrisma.mongoClient = mongoClient;
  }

  // For Prisma 7.x with MongoDB, we need to pass the MongoClient as adapter
  // Verify the adapter is properly initialized
  if (!mongoClient || typeof mongoClient !== "object") {
    throw new Error(`MongoClient adapter is invalid: ${typeof mongoClient}`);
  }

  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log("Creating PrismaClient with MongoDB adapter:", {
      hasMongoClient: !!mongoClient,
      mongoClientType: typeof mongoClient,
      databaseUrl: databaseUrl ? `${databaseUrl.substring(0, 20)}...` : "missing",
    });
  }

  try {
    return new PrismaClient({
      adapter: mongoClient,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (error) {
    console.error("PrismaClient creation error:", error);
    throw error;
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
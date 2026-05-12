import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import gql from "graphql-tag";
import { formatZodError, todoInsertSchema, todoSetSchema } from "./todoZod.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB = process.env.MONGODB_DB || "graphql_todo";
const TODOS_COLLECTION = "todos";

function toObjectId(id) {
  const s = String(id);
  if (!ObjectId.isValid(s)) {
    throw new Error(`Invalid todo id "${id}".`);
  }
  return new ObjectId(s);
}

function mapDoc(doc) {
  if (!doc) {
    return null;
  }
  return {
    id: doc._id.toString(),
    name: doc.name,
    resolved: doc.resolved,
  };
}

export const typeDefs = gql`
  type Todo {
    id: ID!
    name: String!
    resolved: Boolean!
  }

  type Query {
    todos: [Todo!]!
  }

  type Mutation {
    addTodo(name: String!): Todo!
    resolveTodo(id: ID!): Todo!
    unresolveTodo(id: ID!): Todo!
    deleteTodo(id: ID!): ID!
  }
`;

export function buildResolvers(collection) {
  return {
    Query: {
      todos: async () => {
        const cursor = collection.find().sort({ _id: 1 });
        const docs = await cursor.toArray();
        return docs.map((doc) => mapDoc(doc));
      },
    },
    Mutation: {
      addTodo: async (_, { name }) => {
        let insertDoc;
        try {
          insertDoc = todoInsertSchema.parse({ name, resolved: false });
        } catch (err) {
          throw new Error(formatZodError(err));
        }

        const { insertedId } = await collection.insertOne({
          name: insertDoc.name,
          resolved: insertDoc.resolved,
        });
        return mapDoc({
          _id: insertedId,
          name: insertDoc.name,
          resolved: insertDoc.resolved,
        });
      },
      resolveTodo: async (_, { id }) => {
        const _id = toObjectId(id);
        let setDoc;
        try {
          setDoc = todoSetSchema.parse({ resolved: true });
        } catch (err) {
          throw new Error(formatZodError(err));
        }
        const { matchedCount } = await collection.updateOne(
          { _id },
          { $set: setDoc }
        );
        if (matchedCount === 0) {
          throw new Error(`Todo with id "${id}" was not found.`);
        }
        const doc = await collection.findOne({ _id });
        return mapDoc(doc);
      },
      unresolveTodo: async (_, { id }) => {
        const _id = toObjectId(id);
        let setDoc;
        try {
          setDoc = todoSetSchema.parse({ resolved: false });
        } catch (err) {
          throw new Error(formatZodError(err));
        }
        const { matchedCount } = await collection.updateOne(
          { _id },
          { $set: setDoc }
        );
        if (matchedCount === 0) {
          throw new Error(`Todo with id "${id}" was not found.`);
        }
        const doc = await collection.findOne({ _id });
        return mapDoc(doc);
      },
      deleteTodo: async (_, { id }) => {
        const _id = toObjectId(id);
        const { deletedCount } = await collection.deleteOne({ _id });
        if (deletedCount === 0) {
          throw new Error(`Todo with id "${id}" was not found.`);
        }
        return String(id);
      },
    },
  };
}

export function createApolloServer(collection) {
  return new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(collection),
  });
}

export async function createApp(collection) {
  const app = express();
  const apolloServer = createApolloServer(collection);

  await apolloServer.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(apolloServer));

  return { app, apolloServer };
}

export async function startServer({
  mongoUri = MONGODB_URI,
  mongoDb = MONGODB_DB,
  port = process.env.PORT || 4000,
} = {}) {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const collection = client.db(mongoDb).collection(TODOS_COLLECTION);

  const { app, apolloServer } = await createApp(collection);

  const httpServer = app.listen(port, () => {
    console.log(`GraphQL server ready at http://localhost:${port}/graphql`);
    console.log(
      `MongoDB: ${mongoUri} (db: ${mongoDb}, collection: ${TODOS_COLLECTION})`,
    );
  });

  return { app, apolloServer, client, httpServer };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

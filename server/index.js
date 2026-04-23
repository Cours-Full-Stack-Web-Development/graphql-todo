import path from "node:path";
import { fileURLToPath } from "node:url";
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

const typeDefs = gql`
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

function buildResolvers(collection) {
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

async function startServer() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const collection = client.db(MONGODB_DB).collection(TODOS_COLLECTION);

  const app = express();
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(collection),
  });

  await apolloServer.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(apolloServer));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
    console.log(
      `MongoDB: ${MONGODB_URI} (db: ${MONGODB_DB}, collection: ${TODOS_COLLECTION})`,
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

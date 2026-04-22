require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const gql = require("graphql-tag");

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
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error("Todo name cannot be empty.");
        }

        const { insertedId } = await collection.insertOne({
          name: trimmedName,
          resolved: false,
        });
        return mapDoc({
          _id: insertedId,
          name: trimmedName,
          resolved: false,
        });
      },
      resolveTodo: async (_, { id }) => {
        const _id = toObjectId(id);
        const { matchedCount } = await collection.updateOne(
          { _id },
          { $set: { resolved: true } }
        );
        if (matchedCount === 0) {
          throw new Error(`Todo with id "${id}" was not found.`);
        }
        const doc = await collection.findOne({ _id });
        return mapDoc(doc);
      },
      unresolveTodo: async (_, { id }) => {
        const _id = toObjectId(id);
        const { matchedCount } = await collection.updateOne(
          { _id },
          { $set: { resolved: false } }
        );
        if (matchedCount === 0) {
          throw new Error(`Todo with id "${id}" was not found.`);
        }
        const doc = await collection.findOne({ _id });
        return mapDoc(doc);
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
      `MongoDB: ${MONGODB_URI} (db: ${MONGODB_DB}, collection: ${TODOS_COLLECTION})`
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

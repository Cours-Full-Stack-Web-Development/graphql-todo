const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const gql = require("graphql-tag");

let nextTodoId = 1;
const todos = [];

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

const resolvers = {
  Query: {
    todos: () => todos,
  },
  Mutation: {
    addTodo: (_, { name }) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Todo name cannot be empty.");
      }

      const todo = {
        id: String(nextTodoId++),
        name: trimmedName,
        resolved: false,
      };
      todos.push(todo);
      return todo;
    },
    resolveTodo: (_, { id }) => {
      const todo = todos.find((item) => item.id === String(id));
      if (!todo) {
        throw new Error(`Todo with id "${id}" was not found.`);
      }

      todo.resolved = true;
      return todo;
    },
    unresolveTodo: (_, { id }) => {
      const todo = todos.find((item) => item.id === String(id));
      if (!todo) {
        throw new Error(`Todo with id "${id}" was not found.`);
      }

      todo.resolved = false;
      return todo;
    },
  },
};

async function startServer() {
  const app = express();
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(apolloServer));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`GraphQL server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

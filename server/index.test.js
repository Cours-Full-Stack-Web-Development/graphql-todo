import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApolloServer } from "./index.js";
import { InMemoryTodosCollection } from "./test/InMemoryTodosCollection.js";

function singleResult(response) {
  expect(response.body.kind).toBe("single");
  return response.body.singleResult;
}

describe("GraphQL todo API", () => {
  let server;

  beforeEach(async () => {
    const collection = new InMemoryTodosCollection();
    server = createApolloServer(collection);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it("adds, lists, resolves, unresolves, and deletes todos", async () => {
    const addResult = singleResult(
      await server.executeOperation({
        query: `
          mutation AddTodo($name: String!) {
            addTodo(name: $name) {
              id
              name
              resolved
            }
          }
        `,
        variables: { name: "  Write integration tests  " },
      }),
    );

    expect(addResult.errors).toBeUndefined();
    expect(addResult.data.addTodo).toMatchObject({
      name: "Write integration tests",
      resolved: false,
    });

    const todoId = addResult.data.addTodo.id;
    const listResult = singleResult(
      await server.executeOperation({
        query: `
          query GetTodos {
            todos {
              id
              name
              resolved
            }
          }
        `,
      }),
    );

    expect(listResult.errors).toBeUndefined();
    expect(listResult.data.todos).toEqual([
      {
        id: todoId,
        name: "Write integration tests",
        resolved: false,
      },
    ]);

    const resolveResult = singleResult(
      await server.executeOperation({
        query: `
          mutation ResolveTodo($id: ID!) {
            resolveTodo(id: $id) {
              id
              resolved
            }
          }
        `,
        variables: { id: todoId },
      }),
    );

    expect(resolveResult.errors).toBeUndefined();
    expect(resolveResult.data.resolveTodo).toEqual({
      id: todoId,
      resolved: true,
    });

    const unresolveResult = singleResult(
      await server.executeOperation({
        query: `
          mutation UnresolveTodo($id: ID!) {
            unresolveTodo(id: $id) {
              id
              resolved
            }
          }
        `,
        variables: { id: todoId },
      }),
    );

    expect(unresolveResult.errors).toBeUndefined();
    expect(unresolveResult.data.unresolveTodo).toEqual({
      id: todoId,
      resolved: false,
    });

    const deleteResult = singleResult(
      await server.executeOperation({
        query: `
          mutation DeleteTodo($id: ID!) {
            deleteTodo(id: $id)
          }
        `,
        variables: { id: todoId },
      }),
    );

    expect(deleteResult.errors).toBeUndefined();
    expect(deleteResult.data.deleteTodo).toBe(todoId);
  });

  it("returns validation errors from mutations", async () => {
    const result = singleResult(
      await server.executeOperation({
        query: `
          mutation AddTodo($name: String!) {
            addTodo(name: $name) {
              id
            }
          }
        `,
        variables: { name: "   " },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors?.[0].message).toBe("Name cannot be empty.");
  });
});

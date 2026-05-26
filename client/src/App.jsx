import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { DeleteOutlineOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

export const GET_TODOS = gql`
  query GetTodos {
    todos {
      id
      name
      resolved
    }
  }
`;

export const ADD_TODO = gql`
  mutation AddTodo($name: String!) {
    addTodo(name: $name) {
      id
      name
      resolved
    }
  }
`;

export const RESOLVE_TODO = gql`
  mutation ResolveTodo($id: ID!) {
    resolveTodo(id: $id) {
      id
      resolved
    }
  }
`;

export const UNRESOLVE_TODO = gql`
  mutation UnresolveTodo($id: ID!) {
    unresolveTodo(id: $id) {
      id
      resolved
    }
  }
`;

export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`;

function App() {
  const [name, setName] = useState("");
  const [actionError, setActionError] = useState("");
  const { data, loading, error } = useQuery(GET_TODOS);

  const [addTodo, { loading: adding }] = useMutation(ADD_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });
  const [resolveTodo, { loading: resolving }] = useMutation(RESOLVE_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });
  const [unresolveTodo, { loading: unresolving }] = useMutation(
    UNRESOLVE_TODO,
    {
      refetchQueries: [{ query: GET_TODOS }],
      awaitRefetchQueries: true,
    },
  );
  const [deleteTodo, { loading: deleting }] = useMutation(DELETE_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });

  const todos = useMemo(() => data?.todos ?? [], [data]);
  const listBusy = resolving || unresolving || deleting;

  async function handleAddTodo(event) {
    event.preventDefault();
    setActionError("");

    if (!name.trim()) {
      setActionError("Please enter a todo name2.");
      return;
    }

    try {
      await addTodo({
        variables: { name },
      });
      setName("");
    } catch (mutationError) {
      setActionError(mutationError.message);
    }
  }

  async function handleToggleResolved(todoId, currentlyResolved) {
    setActionError("");
    try {
      if (currentlyResolved) {
        await unresolveTodo({ variables: { id: todoId } });
      } else {
        await resolveTodo({ variables: { id: todoId } });
      }
    } catch (mutationError) {
      setActionError(mutationError.message);
    }
  }

  async function handleDeleteTodo(event, todoId) {
    event.stopPropagation();
    setActionError("");
    try {
      await deleteTodo({ variables: { id: todoId } });
    } catch (mutationError) {
      setActionError(mutationError.message);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Todo Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Todos are stored in MongoDB on the server.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleAddTodo}>
              <Typography variant="h6">Add a todo</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="Todo name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={adding || listBusy}
                >
                  Add
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {(error || actionError) && (
          <Alert severity="error">{error ? error.message : actionError}</Alert>
        )}

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Todos
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {loading && (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">Loading todos...</Typography>
              </Stack>
            )}

            {!loading && todos.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No todos yet.
              </Typography>
            )}

            {!loading && todos.length > 0 && (
              <List disablePadding>
                {todos.map((todo) => (
                  <ListItem
                    key={todo.id}
                    divider
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="Delete todo"
                        disabled={listBusy}
                        onClick={(e) => handleDeleteTodo(e, todo.id)}
                        size="small"
                        sx={{ mr: 0.5 }}
                      >
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      onClick={() =>
                        handleToggleResolved(todo.id, todo.resolved)
                      }
                      disabled={listBusy}
                      sx={{ pr: 6 }}
                    >
                      <Checkbox
                        edge="start"
                        tabIndex={-1}
                        disableRipple
                        checked={todo.resolved}
                        slotProps={{ input: { "aria-label": "Resolved" } }}
                        sx={{ pointerEvents: "none" }}
                      />
                      <ListItemText
                        primary={todo.name}
                        secondary={todo.resolved ? "Resolved" : "Open"}
                        sx={{
                          "& .MuiListItemText-primary": {
                            textDecoration: todo.resolved
                              ? "line-through"
                              : "none",
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

export default App;

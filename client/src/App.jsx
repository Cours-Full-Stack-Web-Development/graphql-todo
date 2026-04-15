import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
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
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

const GET_TODOS = gql`
  query GetTodos {
    todos {
      id
      name
      resolved
    }
  }
`;

const ADD_TODO = gql`
  mutation AddTodo($name: String!) {
    addTodo(name: $name) {
      id
      name
      resolved
    }
  }
`;

const RESOLVE_TODO = gql`
  mutation ResolveTodo($id: ID!) {
    resolveTodo(id: $id) {
      id
      resolved
    }
  }
`;

const UNRESOLVE_TODO = gql`
  mutation UnresolveTodo($id: ID!) {
    unresolveTodo(id: $id) {
      id
      resolved
    }
  }
`;

function App() {
  const [name, setName] = useState('');
  const [actionError, setActionError] = useState('');
  const { data, loading, error } = useQuery(GET_TODOS);

  const [addTodo, { loading: adding }] = useMutation(ADD_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });
  const [resolveTodo, { loading: resolving }] = useMutation(RESOLVE_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });
  const [unresolveTodo, { loading: unresolving }] = useMutation(UNRESOLVE_TODO, {
    refetchQueries: [{ query: GET_TODOS }],
    awaitRefetchQueries: true,
  });

  const todos = useMemo(() => data?.todos ?? [], [data]);

  async function handleAddTodo(event) {
    event.preventDefault();
    setActionError('');

    if (!name.trim()) {
      setActionError('Please enter a todo name.');
      return;
    }

    try {
      await addTodo({
        variables: { name },
      });
      setName('');
    } catch (mutationError) {
      setActionError(mutationError.message);
    }
  }

  async function handleResolveTodo(todoId) {
    setActionError('');
    try {
      await resolveTodo({
        variables: { id: todoId },
      });
    } catch (mutationError) {
      setActionError(mutationError.message);
    }
  }

  async function handleUnresolveTodo(todoId) {
    setActionError('');
    try {
      await unresolveTodo({
        variables: { id: todoId },
      });
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
            Todos are stored in server memory and reset when the server stops.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleAddTodo}>
              <Typography variant="h6">Add a todo</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="Todo name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={adding || resolving || unresolving}
                >
                  Add
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {(error || actionError) && (
          <Alert severity="error">
            {error ? error.message : actionError}
          </Alert>
        )}

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Todos
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {loading && (
              <Stack direction="row" spacing={1.5} alignItems="center">
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
                    secondaryAction={
                      <Button
                        variant="text"
                        disabled={resolving || unresolving}
                        onClick={() =>
                          todo.resolved
                            ? handleUnresolveTodo(todo.id)
                            : handleResolveTodo(todo.id)
                        }
                      >
                        {todo.resolved ? 'Unresolve' : 'Resolve'}
                      </Button>
                    }
                  >
                    <Checkbox checked={todo.resolved} disableRipple />
                    <ListItemText
                      primary={todo.name}
                      secondary={todo.resolved ? 'Resolved' : 'Open'}
                      sx={{
                        '& .MuiListItemText-primary': {
                          textDecoration: todo.resolved ? 'line-through' : 'none',
                        },
                      }}
                    />
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

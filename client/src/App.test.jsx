import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App, { ADD_TODO, GET_TODOS } from './App';

const theme = createTheme();

function renderApp(mocks) {
  return render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </MockedProvider>,
  );
}

describe('App', () => {
  it('shows the empty state after loading todos', async () => {
    renderApp([
      {
        request: { query: GET_TODOS },
        result: { data: { todos: [] } },
      },
    ]);

    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
    expect(await screen.findByText('No todos yet.')).toBeInTheDocument();
  });

  it('validates blank todo names before calling the API', async () => {
    const user = userEvent.setup();
    renderApp([
      {
        request: { query: GET_TODOS },
        result: { data: { todos: [] } },
      },
    ]);

    await screen.findByText('No todos yet.');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Please enter a todo name.')).toBeInTheDocument();
  });

  it('adds a todo and refreshes the list', async () => {
    const user = userEvent.setup();
    renderApp([
      {
        request: { query: GET_TODOS },
        result: { data: { todos: [] } },
      },
      {
        request: {
          query: ADD_TODO,
          variables: { name: 'Write component tests' },
        },
        result: {
          data: {
            addTodo: {
              id: '000000000000000000000001',
              name: 'Write component tests',
              resolved: false,
            },
          },
        },
      },
      {
        request: { query: GET_TODOS },
        result: {
          data: {
            todos: [
              {
                id: '000000000000000000000001',
                name: 'Write component tests',
                resolved: false,
              },
            ],
          },
        },
      },
    ]);

    await screen.findByText('No todos yet.');
    await user.type(screen.getByLabelText('Todo name'), 'Write component tests');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Write component tests')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByLabelText('Todo name')).toHaveValue('');
  });
});

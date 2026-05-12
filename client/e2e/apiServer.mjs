import { createApp } from '../../server/index.js';
import { InMemoryTodosCollection } from '../../server/test/InMemoryTodosCollection.js';

const port = Number(process.env.PORT || 4000);
const collection = new InMemoryTodosCollection();
const { app, apolloServer } = await createApp(collection);

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

const httpServer = app.listen(port, '127.0.0.1', () => {
  console.log(`E2E GraphQL server ready at http://127.0.0.1:${port}/graphql`);
});

async function shutdown() {
  await apolloServer.stop();
  httpServer.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

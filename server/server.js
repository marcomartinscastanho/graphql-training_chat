import { ApolloServer } from "@apollo/server";
import { expressMiddleware as apolloMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { readFile } from "node:fs/promises";
import { useServer as useWsServer } from "graphql-ws/lib/use/ws";
import { createServer as createHttpServer } from "node:http";
import { authMiddleware, decodeToken, handleLogin } from "./auth.js";
import { resolvers } from "./resolvers.js";
import { WebSocketServer } from "ws";
import { makeExecutableSchema } from "@graphql-tools/schema";

const PORT = 9000;

const app = express();
app.use(cors(), express.json());

app.post("/login", handleLogin);

const getHttpContext = ({ req }) => {
  if (req.auth) {
    return { user: req.auth.sub };
  }
  return {};
};

const getWsContext = ({ connectionParams }) => {
  const accessToken = connectionParams?.accessToken;
  if (accessToken) {
    const payload = decodeToken(accessToken);
    return { user: payload.sub };
  }
  return {};
};

const typeDefs = await readFile("./schema.graphql", "utf8");
const schema = makeExecutableSchema({ typeDefs, resolvers });
// ApolloServer provides the "graphql over http (REST)" functionality
const apolloServer = new ApolloServer({ schema });
await apolloServer.start();
app.use(
  "/graphql",
  authMiddleware,
  apolloMiddleware(apolloServer, {
    context: getHttpContext,
  })
);

// Now we need to provide "graphql over websocket"
// http is based on client request, which works fine for queries and mutations
// but does not support subscriptions
// for that we need websockets.
// In websockets, the client creates a connection to the server that stays open (contrary to http)
// and the server uses that connection to update the client whenever an event occurs
// Anyway, websocket needs http server because the request to establish the connection is an http requests
const httpServer = createHttpServer(app);
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
// this will add the graphql functionality on top of the ws server
useWsServer({ schema, context: getWsContext }, wsServer);

httpServer.listen({ port: PORT }, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});

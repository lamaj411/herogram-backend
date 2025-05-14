import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket"; // ✅ official plugin
import cors from "@fastify/cors";

const fastify = Fastify({ logger: true });

// Register WebSocket plugin
fastify.register(websocketPlugin);

await fastify.register(cors, { origin: true });

// In-memory message store
const messages = [];

// REST API
fastify.get("/messages", async (request, reply) => {
  return { messages };
});

// WebSocket API
fastify.get("/ws", { websocket: true }, (connection, req) => {
  connection.on("message", (message) => {
    const msg = message.toString();
    const msgObj = {
      text: msg,
      timestamp: new Date().toISOString(),
    };

    messages.push(msgObj);

    // Broadcast to all clients
    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(msgObj));
      }
    });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
    console.log("🚀 Server running at http://localhost:3001");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

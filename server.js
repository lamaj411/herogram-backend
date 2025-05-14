import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket"; // ✅ official plugin
import jwt from "@fastify/jwt"; // ✅ import JWT plugin
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Poll } from "./models/poll.js"; // ✅ import Poll model

dotenv.config();

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: true });
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || "supersecret",
}); // ✅ register JWT plugin
await fastify.register(websocketPlugin); // ✅ use official WebSocket plugin

// MongoDB connection
await mongoose.connect(
  process.env.MONGO_URI || "mongodb://localhost:27017/team_polls"
);

// In-memory WebSocket connections
const clients = new Map();

fastify.post("/auth/anon", async (request, reply) => {
  const token = fastify.jwt.sign(
    {
      userId: "anon-" + Math.random().toString(36).substring(2, 10),
    },
    { expiresIn: "10m" } // ⏱️ Short-lived token
  );

  return { token };
});

// Create poll
fastify.post("/poll", async (req, reply) => {
  const { question, options, expiresAt } = req.body;
  const poll = await Poll.create({ question, options, votes: [], expiresAt });
  reply.send({ id: poll.id });
});

// Vote
fastify.post("/poll/:id/vote", async (req, reply) => {
  try {
    const { id } = req.params;
    const { vote, userId } = req.body;

    const poll = await Poll.findOne({ id });
    if (!poll) return reply.status(404).send({ error: "Poll not found" });
    if (new Date() > new Date(poll.expiresAt))
      return reply.status(400).send({ error: "Poll expired" });

    const hasVoted = poll.votes.some((v) => v.userId === userId);
    if (hasVoted)
      return reply.status(409).send({ error: "User already voted" });

    poll.votes.push({ userId, option: vote });
    await poll.save();

    const votes = countVotes(poll.votes);
    broadcast(id, votes);

    reply.send({ message: "Vote recorded" });
  } catch (e) {
    console.log(e);
  }
});

// Poll results
fastify.get("/poll/:id", async (req, reply) => {
  try {
    const result = await Poll.findOne({ id: req.params.id });
    reply.send(result);
  } catch (e) {
    console.log(e);
  }
});

// WebSocket channel for real-time tally
fastify.get("/poll/:id/ws", { websocket: true }, (connection, req) => {
  const pollId = req.params.id;
  if (!clients.has(pollId)) clients.set(pollId, new Set());
  clients.get(pollId).add(connection);
});

// Helper: count tally
function countVotes(votes) {
  const tally = {};
  for (const { option } of votes) {
    tally[option] = (tally[option] || 0) + 1;
  }
  return tally;
}

// Helper: broadcast to WebSocket clients
function broadcast(pollId, data) {
  const sockets = clients.get(pollId) || [];
  for (const socket of sockets) {
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
}

// Start server
fastify.listen({ port: 3001 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log("✅ Fastify server running on http://localhost:3001");
});

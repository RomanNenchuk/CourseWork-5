import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import chatSocket from "./sockets/chatSocket.js";
import connectDB from "./db.js";
import { program } from "commander";

program
  .option("-h, --host <server address>", "server address")
  .option("-p, --port <server port>", "server port number");

program.parse(process.argv);
const options = program.opts();
const HOST = options.host || "127.0.0.1";
const PORT = options.port || 3500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Підключення до бази даних
connectDB().catch((err) => {
  console.error("Failed to connect to database, exiting...");
  process.exit(1); // Завершення процесу у разі невдачі
});

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, HOST, () =>
  console.log(`Listening on port ${PORT}`)
);

// Підключення Socket.IO
const io = new Server(expressServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : "*",
  },
});

chatSocket(io);

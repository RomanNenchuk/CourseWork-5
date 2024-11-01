import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import chatSocket from "./sockets/chatSocket.js";
import mongoose from "mongoose";
import Room from "./models/Room.js";
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

// Підключення до бази даних і очищення активності користувачів з попередньої сесії
mongoose
  .connect("mongodb://127.0.0.1:27017/mydatabase")
  .then(async () => {
    console.log("Connected to server");
    await Room.updateMany(
      { "participants.active": true }, // Знаходимо всі кімнати, де учасники активні
      { $set: { "participants.$[].active": false } } // Оновлюємо статус активності всіх учасників
    );
  })
  .catch((err) => console.log(err));
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

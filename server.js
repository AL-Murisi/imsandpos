import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? "https://imsandpos.vercel.app"
          : "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Test broadcast
    socket.on("test:emit", (msg) => {
      console.log("Message received:", msg);
      io.emit("test:broadcast", msg);
    });

    // 🔥 New: Stock update event
    socket.on("stock:update", (data) => {
      console.log("Stock update:", data);

      // Broadcast to all OTHER clients (excluding sender)
      socket.broadcast.emit("stock:updated", data);
    });

    // 🔥 New: Sale completed event
    socket.on("sale:completed", (data) => {
      console.log("Sale completed:", data);

      // Broadcast to all OTHER clients
      socket.broadcast.emit("sale:refresh", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

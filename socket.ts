import { Server } from "socket.io";
import http from "http";

const server = http.createServer();

export const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);
});

server.listen(4000, () => {
  console.log("🚀 Socket running on :4000");
});

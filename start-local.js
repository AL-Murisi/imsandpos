const { exec, spawn } = require("child_process");
const http = require("http");
const path = require("path");

// Start Next.js server
const app = exec("npm run start");

app.stdout.on("data", (data) => console.log(data));
app.stderr.on("data", (data) => console.error(data));

// Poll localhost:3000 until it responds
const waitForServer = () => {
  return new Promise((resolve) => {
    const check = () => {
      http
        .get("http://localhost:3000", () => resolve())
        .on("error", () => {
          setTimeout(check, 1000);
        });
    };
    check();
  });
};

waitForServer().then(() => {
  console.log("Server is ready, opening PWA...");

  // Windows default Chrome path
  const chromePath = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;

  spawn(chromePath, ["--app=http://localhost:3000"], {
    stdio: "ignore",
    detached: true,
    shell: true, // <-- needed for Windows to handle the path string
  }).unref();
});

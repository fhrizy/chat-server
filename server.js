require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const http = require("http");
const server = http.createServer(app);

const host = process.env.HOST;
const port = parseInt(process.env.PORT);
const address = `http://${host}:${port}`;

var corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

require("./routes")(app);

server.listen(port, host, () => {
  console.log(`server is running on port ${address}`);
});

const db = require("./models");
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to the Database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!" + err);
    process.exit();
  });

const io = require("socket.io")(
  server,
  (options = { cors: true, origins: "*" })
);
require("./routes/socketio")(io);
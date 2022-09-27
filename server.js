const express = require("express");
const app = express();
const multer = require("multer");
const forms = multer();
const cors = require("cors");
const fs = require("fs");

const util = require("./scripts/util");

const knex = require("knex")({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "",
    database: "chat_system",
  },
});

const port = 3000;

app.use(forms.array());
app.use(cors());

app.get("/", (request, res) => {
  const file = fs.readFileSync("./html/api_doc.html", "utf-8");
  res.send(file);
});

app.post("/login", (request, res) => {
  const data = request.body || {};
  const account = data.account || "";
  if (!account) {
    res.status(400).send("'account' is required!");
  }
  const password = data.password || "";
  if (!password) {
    res.status(400).send("'password' is required!");
  }

  knex
    .select(["id", "account", "updated_at", "created_at"])
    .from("user")
    .where({ account, password })
    .then((result) => {
      if (result.length == 1) {
        const token = require("./scripts/auth").generateToken(result[0].id);
        res.send({
          ...result[0],
          created_at: util.dateFormat(result[0].created_at),
          updated_at: util.dateFormat(result[0].created_at),
          token,
        });
      }
      res.status(400).send("account or password error!");
    });
});

app.post("logout", async (request, res) => {
  const data = request.body || {};
  const token = data.token || "";
  if (!token) {
    res.status(400).send("token is required!");
  }
  const user = await require("./scripts/auth").auth(token);
  if (!user) {
    res.status(403).send("auth fail!");
  }
  knex("user")
    .where({ id: user.id })
    .update({ token: "" })
    .then(() => {
      res.send();
    });
});

app.post("/register", (request, res) => {
  const { account, password } = request.body;
  if (!account) {
    res.status(400).send("'account' is required!");
  }
  if (!password) {
    res.status(400).send("'password' is required!");
  }

  knex("user")
    .insert({ account, password })
    .then((result) => {
      res.send({ status: true });
    })
    .catch((err) => res.status(400).send(err.sqlMessage));
});

app.post("/message/send", async (request, res) => {
  const data = request.body || {};
  const token = data.token || "";
  if (!token) {
    res.status(400).send("token is required!");
  }

  const content = data.content || "";
  if (!content) {
    res.status(400).send("content is required!");
  }

  const user = await require("./scripts/auth").auth(token);
  if (!user) {
    res.status(403).send("auth fail!");
  }
  knex("chat_room")
    .insert({ sender: user.id, content })
    .then((result) => {
      res.send({ status: true });
    });
});

app.get("/message/get", (request, res) => {
  const data = request.query || {};
  const query = knex("chat_room")
    .select([
      "chat_room.id",
      "user.account",
      "chat_room.content",
      "chat_room.created_at",
    ])
    .leftJoin("user", "chat_room.sender", "user.id")
    .orderBy("chat_room.id", "desc");

  const startTime = data.startTime || "";
  if (startTime) {
    query.where("chat_room.created_at", ">", startTime);
  }

  const endTime = data.endTime || "";
  if (endTime) {
    query.where("chat_room.created_at", "<", endTime);
  }

  const limit = Number(data.limit || 0);
  if (limit) {
    query.limit(limit);
  }

  query.then((result) => {
    res.send(
      result.map((row) => {
        return {
          ...row,
          created_at: util.dateFormat(row.created_at),
        };
      })
    );
  });
});

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});

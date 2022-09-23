const express = require("express");
const app = express();

const multer = require("multer");
const forms = multer();

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

app.get("/", (request, res) => {
  res.send(`<table class="table table-bordered table-hover table-condensed">
  <thead><tr><th title="Field #1">api</th>
  <th title="Field #2">method</th>
  <th title="Field #3">request</th>
  <th title="Field #4">example</th>
  <th title="Field #5">response</th>
  <th title="Field #6">example</th>
  </tr></thead>
  <tbody><tr>
  <td>/register</td>
  <td>post</td>
  <td>account:帳號<br/>password:密碼</td>
  <td>{<br/>   &quot;account&quot;:&quot;user001&quot;,<br/>   &quot;password&quot;:&quot;user001&quot;<br/>}</td>
  <td>status:狀態</td>
  <td>{<br/>   &quot;status&quot;: true<br/>}</td>
  </tr>
  <tr>
  <td>/login</td>
  <td>post</td>
  <td>account:帳號<br/>password:密碼</td>
  <td>{<br/>   &quot;account&quot;:&quot;user001&quot;,<br/>   &quot;password&quot;:&quot;user001&quot;<br/>}</td>
  <td>id:ID<br/>account:帳號<br/>updated_at:更新時間<br/>created_at:建立時間<br/>token:令牌</td>
  <td>{<br/>   &quot;id&quot;:1,<br/>   &quot;account&quot;:&quot;user001&quot;,<br/>   &quot;updated_at&quot;:&quot;2020-10-10 00:00:00&quot;,<br/>   &quot;created_at&quot;:&quot;2020-10-10 00:00:00&quot;,<br/>   &quot;token&quot;:&quot;T9NvL8qs0zjwFAtjkqzP00ZYYDK59jSsKdAH&quot;<br/>}</td>
  </tr>
  <tr>
  <td>/logout</td>
  <td>post</td>
  <td> </td>
  <td> </td>
  <td> </td>
  <td> </td>
  </tr>
  <tr>
  <td>/message/send</td>
  <td>post</td>
  <td>token:令牌<br/>content:訊息內容</td>
  <td>{<br/>   &quot;token&quot;:&quot;T9NvL8qs0zjwFAtjkqzP00ZYYDK59jSsKdAH&quot;,<br/>   &quot;content&quot;:&quot;安安&quot;<br/>}</td>
  <td>status:狀態</td>
  <td>{<br/>   &quot;status&quot;: true<br/>}</td>
  </tr>
  <tr>
  <td>/message/get</td>
  <td>get</td>
  <td>startTime?:起始時間<br/>endTime?:結束時間<br/>limit?:限制筆數</td>
  <td>{<br/>   &quot;startTime&quot;:&quot;2020-10-10 00:00:00&quot;,<br/>   &quot;endTime&quot;:&quot;2020-10-10 00:00:00&quot;,<br/>   &quot;limit&quot;:10<br/>}</td>
  <td>id:ID<br/>account:帳號<br/>content:訊息內容<br/>created_at:建立時間</td>
  <td>[{<br/>   &quot;id&quot;:5,<br/>   &quot;account&quot;:&quot;user001&quot;,<br/>   &quot;content&quot;:&quot;安安&quot;,<br/>   &quot;created_at&quot;:&quot;2020-10-10 00:00:00&quot;<br/>}]</td>
  </tr>
  </tbody></table>`);
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
  const data = request.query;
  const query = knex("chat_room")
    .select([
      "chat_room.id",
      "user.account",
      "chat_room.content",
      "chat_room.created_at",
    ])
    .leftJoin("user", "chat_room.sender", "user.id")
    .orderBy("chat_room.id", "desc");

  if (data.startTime || "") {
    query.where("chat_room.created_at", ">", data.startTime);
  }

  if (data.endTime || "") {
    query.where("chat_room.created_at", "<", data.endTime);
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

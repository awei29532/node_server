const util = require("./util");

const knex = require("knex")({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "",
    database: "chat_system",
  },
});

function generateToken(id, length = 36) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  knex("user").where({ id }).update({ token });
  return token;
}

async function auth(token) {
  const res =
    util.parse(await knex.select("*").from("user").where({ token }))[0] || null;

  if (res) {
    res.created_at = util.dateFormat(res.created_at);
    res.updated_at = util.dateFormat(res.updated_at);
  }

  return res;
}

module.exports = {
  generateToken,
  auth,
};

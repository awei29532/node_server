const date_fns = require("date-fns");

function parse(res) {
  return JSON.parse(JSON.stringify(res));
}

function dateFormat(date) {
  return date_fns.format(date, "yyyy-MM-dd HH:mm:ss");
}

module.exports = {
  parse,
  dateFormat,
};

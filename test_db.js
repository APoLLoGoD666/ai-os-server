const db = require("./database");

const row = db.prepare("SELECT 1 + 1 AS result").get();

console.log(row);
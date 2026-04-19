const db = require("./database");

// 1. Show all tables
console.log("\n📋 TABLES:");
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

// 2. Show schema of documents table
console.log("\n🧠 SCHEMA:");
console.log(
    db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get()
);

// 3. Show all data
console.log("\n📊 DATA:");
console.log(db.prepare("SELECT * FROM documents").all());
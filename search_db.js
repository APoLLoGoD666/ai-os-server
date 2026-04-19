const db = require("./database");

// 🔧 SETTINGS (edit these)
const searchType = "all"; // uni | business | personal | summary | all
const keyword = ""; // optional text search

function formatRow(row) {
    return `
📄 ${row.filename}
📂 ${row.classification}
🧾 ${row.summary}
----------------------------
`;
}

function search() {
    console.log("\n🔍 SEARCH RESULTS\n");

    let rows;

    // 🔹 FILTER 1: by category
    if (searchType !== "all" && !keyword) {
        rows = db.prepare(`
            SELECT * FROM documents
            WHERE classification = ?
        `).all(searchType);
    }

    // 🔹 FILTER 2: all data
    else if (searchType === "all" && !keyword) {
        rows = db.prepare(`
            SELECT * FROM documents
        `).all();
    }

    // 🔹 FILTER 3: keyword search
    else if (keyword) {
        rows = db.prepare(`
            SELECT * FROM documents
            WHERE content LIKE ? OR summary LIKE ?
        `).all(`%${keyword}%`, `%${keyword}%`);
    }

    if (!rows || rows.length === 0) {
        console.log("No results found.");
        return;
    }

    // 🔹 CLEAN OUTPUT
    rows.forEach(row => {
        console.log(formatRow(row));
    });
}

search();
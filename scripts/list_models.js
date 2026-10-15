
console.log("THIS IS THE REAL FILE");

const axios = require("axios");

console.log("SCRIPT STARTED");

async function listModels() {
  try {
    console.log("🚀 Sending request...");

    const response = await axios.get(
      "https://api.anthropic.com/v1/models",
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        }
      }
    );

    console.log("✅ RESPONSE RECEIVED");

    console.log("STATUS:", response.status);
    console.log("HEADERS:", response.headers);

    console.log("DATA:");
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log("❌ ERROR CAUGHT");

    if (error.response) {
      console.log("STATUS:", error.response.status);
      console.log("DATA:", error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

listModels();
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const port = process.env.PORT;

// OAuth Client Setup
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `https://a-simple-chatbot-x19a.onrender.com/auth/google/callback`
);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Google OAuth Login
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
  });
  res.redirect(authUrl);
});

// Google OAuth Callback
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await response.json();

    // Redirect to frontend with username
    res.redirect(`/?username=${userInfo.name}`);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

// Chat API (Gemini AI)
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }]
          }
        ]
      }),
    });

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini API";

    res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Error communicating with Gemini API" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

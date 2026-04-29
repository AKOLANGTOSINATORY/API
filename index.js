const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ORCA Donation Proxy is live - Gamepass Edition!");
});

app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId" });
    }

    try {
        console.log(`Fetching Gamepasses for User: ${userId}`);
        
        // Step 1: Get all public games (universes) created by the user
        const gamesRes = await fetch(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&sortOrder=Asc&limit=50`);
        if (!gamesRes.ok) throw new Error("Failed to fetch user games");
        const gamesData = await gamesRes.json();
        
        let allGamepasses = [];

        // Step 2: Loop through each game and fetch its gamepasses
        for (const game of gamesData.data) {
            const passesRes = await fetch(`https://games.roblox.com/v1/games/${game.id}/game-passes?limit=100&sortOrder=Asc`);
            
            if (passesRes.ok) {
                const passesData = await passesRes.json();
                
                if (passesData.data) {
                    for (const pass of passesData.data) {
                        // Only add passes that actually cost Robux
                        if (pass.price > 0) { 
                            allGamepasses.push({
                                Id: pass.id,
                                Name: pass.name,
                                Type: "GamePass", // Tags it properly for your UI
                                Price: pass.price,
                                ImageId: pass.id, 
                                Owned: false
                            });
                        }
                    }
                }
            }
        }

        console.log(`Found ${allGamepasses.length} gamepasses for User ${userId}`);
        return res.json(allGamepasses);

    } catch (error) {
        console.error(`❌ Proxy Error for ${userId}:`, error.message);
        return res.status(500).json({ error: "Failed to fetch donation items" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💸 ORCA Proxy running on port ${PORT}`);
});

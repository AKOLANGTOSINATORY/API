const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ORCA Donation Proxy is live - RoProxy Bypass Active!");
});

app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId" });
    }

    try {
        console.log(`Fetching Gamepasses AND Clothing for User: ${userId}`);
        let allItems = [];

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        // ==========================================
        // STEP 1: FETCH CLOTHING (Via RoProxy)
        // ==========================================
        try {
            const catalogUrl = `https://catalog.roproxy.com/v1/search/items/details?CreatorTargetId=${userId}&CreatorType=User&Category=3&Limit=30`;
            const catalogRes = await fetch(catalogUrl, { headers });
            
            if (catalogRes.ok) {
                const catalogData = await catalogRes.json();
                if (catalogData.data) {
                    for (const item of catalogData.data) {
                        if (item.price && item.price > 0) {
                            allItems.push({
                                Id: item.id,
                                Name: item.name,
                                Type: "Clothing",
                                Price: item.price,
                                ImageId: item.id,
                                Owned: false
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Clothing fetch error:", err.message);
        }

        // ==========================================
        // STEP 2: FETCH GAMEPASSES (Via RoProxy)
        // ==========================================
        try {
            // First get the games
            const gamesUrl = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&sortOrder=Asc&limit=50`;
            const gamesRes = await fetch(gamesUrl, { headers });
            
            if (gamesRes.ok) {
                const gamesData = await gamesRes.json();
                if (gamesData.data) {
                    for (const game of gamesData.data) {
                        // Then get passes for each game
                        const passesUrl = `https://games.roproxy.com/v1/games/${game.id}/game-passes?limit=100&sortOrder=Asc`;
                        const passesRes = await fetch(passesUrl, { headers });
                        
                        if (passesRes.ok) {
                            const passesData = await passesRes.json();
                            if (passesData.data) {
                                for (const pass of passesData.data) {
                                    if (pass.price && pass.price > 0) {
                                        allItems.push({
                                            Id: pass.id,
                                            Name: pass.name,
                                            Type: "GamePass",
                                            Price: pass.price,
                                            ImageId: pass.id,
                                            Owned: false
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Gamepass fetch error:", err.message);
        }

        // ==========================================
        // STEP 3: SORT & RETURN
        // ==========================================
        allItems.sort((a, b) => a.Price - b.Price);

        console.log(`Success! Found ${allItems.length} items for ${userId}`);
        return res.json(allItems);

    } catch (error) {
        console.error(`❌ Global Proxy Error:`, error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💸 ORCA Proxy running on port ${PORT}`);
});

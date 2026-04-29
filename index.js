const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("💸 ORCA Donation Proxy (Stable Build) Running");
});

// ===============================
// SAFE FETCH
// ===============================
async function safeFetch(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!res.ok) {
            console.log(`❌ Failed: ${url}`);
            return null;
        }

        return await res.json();
    } catch (err) {
        console.log("❌ Fetch error:", err.message);
        return null;
    }
}

// ===============================
// FETCH CLOTHING (SHIRTS + PANTS)
// ===============================
async function fetchClothing(userId) {
    let items = [];
    const categories = [11, 12]; // shirts + pants

    for (const category of categories) {
        let cursor = "";
        let page = 0;

        do {
            const url = `https://catalog.roproxy.com/v1/search/items/details?CreatorTargetId=${userId}&CreatorType=User&Category=${category}&Limit=30&Cursor=${cursor}`;
            const data = await safeFetch(url);

            if (!data || !data.data) break;

            for (const item of data.data) {
                items.push({
                    Id: item.id,
                    Name: item.name,
                    Type: "Clothing",
                    Price: item.price || 0,
                    ImageId: item.id,
                    Owned: false
                });
            }

            cursor = data.nextPageCursor;
            page++;

        } while (cursor && page < 5);
    }

    console.log(`👕 Clothing fetched: ${items.length}`);
    return items;
}

// ===============================
// FETCH GAMEPASSES (FIXED)
// ===============================
async function fetchGamepasses(userId) {
    let passes = [];

    const gamesData = await safeFetch(
        `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50`
    );

    if (!gamesData || !gamesData.data) {
        console.log("❌ No games found");
        return passes;
    }

    console.log(`🎮 Games found: ${gamesData.data.length}`);

    for (const game of gamesData.data) {
        console.log(`➡️ Checking game ${game.id}`);

        // PRIMARY METHOD
        let passData = await safeFetch(
            `https://games.roproxy.com/v1/games/${game.id}/game-passes?limit=100`
        );

        // FALLBACK METHOD (VERY IMPORTANT)
        if (!passData || !passData.data || passData.data.length === 0) {
            console.log("⚠️ Primary failed, using fallback...");

            passData = await safeFetch(
                `https://apis.roproxy.com/game-passes/v1/games/${game.id}/passes?limit=100`
            );
        }

        if (!passData || !passData.data) continue;

        console.log(`💸 Passes found: ${passData.data.length}`);

        for (const pass of passData.data) {
            passes.push({
                Id: pass.id,
                Name: pass.name,
                Type: "GamePass",
                Price: pass.price || 0,
                ImageId: pass.id,
                Owned: false
            });
        }
    }

    return passes;
}

// ===============================
// MAIN ENDPOINT
// ===============================
app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
    }

    console.log(`\n🔍 Fetching for user: ${userId}`);

    try {
        const clothing = await fetchClothing(userId);
        const gamepasses = await fetchGamepasses(userId);

        let allItems = [...clothing, ...gamepasses];

        console.log(`📦 Total before filter: ${allItems.length}`);

        // 🔥 Donation filter
        allItems = allItems.filter(item => item.Price > 0);

        console.log(`💰 After filter: ${allItems.length}`);

        // Sort cheapest first
        allItems.sort((a, b) => a.Price - b.Price);

        return res.json(allItems);

    } catch (err) {
        console.log("❌ API crash:", err.message);
        return res.status(500).json({ error: "Server error" });
    }
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ORCA Proxy running on port ${PORT}`);
});

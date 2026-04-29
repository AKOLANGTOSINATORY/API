const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("💸 ORCA Donation Proxy (Stable Build) Running");
});

// ===============================
// SAFE FETCH (NO DEPENDENCIES)
// ===============================
async function safeFetch(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!res.ok) {
            console.log(`❌ Failed request: ${url}`);
            return null;
        }

        return await res.json();
    } catch (err) {
        console.log(`❌ Fetch error: ${err.message}`);
        return null;
    }
}

// ===============================
// CLOTHING FETCH (SHIRTS + PANTS)
// ===============================
async function fetchClothing(userId) {
    let items = [];
    const categories = [11, 12];

    for (const category of categories) {
        let cursor = "";
        let loops = 0;

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
                    ImageId: item.id
                });
            }

            cursor = data.nextPageCursor;
            loops++;

        } while (cursor && loops < 5);
    }

    console.log(`👕 Clothing fetched: ${items.length}`);
    return items;
}

// ===============================
// GAMEPASS FETCH (FIXED + STABLE)
// ===============================
async function fetchGamepasses(userId) {
    let passes = [];

    // Step 1: get games
    const games = await safeFetch(
        `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50`
    );

    if (!games || !games.data) {
        console.log("❌ No games found");
        return [];
    }

    console.log(`🎮 Games found: ${games.data.length}`);

    // Step 2: fallback-based pass fetching (more stable than game endpoint)
    for (const game of games.data) {
        console.log(`➡️ Checking game: ${game.id}`);

        // ⚠️ TRY game-pass endpoint first
        let passData = await safeFetch(
            `https://games.roproxy.com/v1/games/${game.id}/game-passes?limit=100`
        );

        // 🔥 IF FAIL → fallback to catalog-based lookup (REAL FIX)
        if (!passData || !passData.data) {
            console.log("⚠️ Game endpoint failed → using catalog fallback");

            passData = await safeFetch(
                `https://catalog.roproxy.com/v1/search/items/details?Category=9&CreatorTargetId=${userId}&CreatorType=User&Limit=30`
            );
        }

        if (!passData || !passData.data) continue;

        for (const pass of passData.data) {
            passes.push({
                Id: pass.id,
                Name: pass.name,
                Type: "GamePass",
                Price: pass.price || 0,
                ImageId: pass.id
            });
        }
    }

    console.log(`💸 Gamepasses fetched: ${passes.length}`);
    return passes;
}

// ===============================
// MAIN API
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

        // 💸 ONLY DONATION ITEMS
        allItems = allItems.filter(item => item.Price > 0);

        console.log(`💰 After filter: ${allItems.length}`);

        // sort cheapest first
        allItems.sort((a, b) => a.Price - b.Price);

        return res.json(allItems);

    } catch (err) {
        console.log("❌ Server error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ORCA Proxy running on port ${PORT}`);
});

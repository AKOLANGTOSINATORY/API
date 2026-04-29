const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // IMPORTANT

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ORCA Donation Proxy is live - RoProxy Bypass Active!");
});

// Helper: fetch with safety
async function safeFetch(url, headers) {
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error("Fetch error:", err.message);
        return null;
    }
}

// Helper: paginate catalog
async function fetchCatalog(userId, category, headers) {
    let items = [];
    let cursor = "";
    let page = 0;

    do {
        const url = `https://catalog.roproxy.com/v1/search/items/details?CreatorTargetId=${userId}&CreatorType=User&Category=${category}&Limit=30&Cursor=${cursor}`;
        const data = await safeFetch(url, headers);

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

    } while (cursor && page < 5); // prevent abuse loop

    return items;
}

// Helper: fetch gamepasses
async function fetchGamepasses(userId, headers) {
    let passes = [];

    const gamesUrl = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&sortOrder=Asc&limit=50`;
    const gamesData = await safeFetch(gamesUrl, headers);

    if (!gamesData || !gamesData.data) return passes;

    for (const game of gamesData.data) {
        const passesUrl = `https://games.roproxy.com/v1/games/${game.id}/game-passes?limit=100&sortOrder=Asc`;
        const passesData = await safeFetch(passesUrl, headers);

        if (!passesData || !passesData.data) continue;

        for (const pass of passesData.data) {
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

app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
    }

    console.log(`🔍 Fetching items for ${userId}`);

    const headers = {
        "User-Agent": "Mozilla/5.0"
    };

    try {
        let allItems = [];

        // 🔹 Fetch clothing (shirts + pants)
        const shirtItems = await fetchCatalog(userId, 11, headers);
        const pantsItems = await fetchCatalog(userId, 12, headers);

        // 🔹 Fetch gamepasses
        const gamepasses = await fetchGamepasses(userId, headers);

        allItems = [
            ...shirtItems,
            ...pantsItems,
            ...gamepasses
        ];

        // 🔹 Remove items with 0 price IF you want donation only
        allItems = allItems.filter(item => item.Price > 0);

        // 🔹 Sort cheapest first
        allItems.sort((a, b) => a.Price - b.Price);

        console.log(`✅ Found ${allItems.length} items`);

        res.json(allItems);

    } catch (err) {
        console.error("❌ API Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💸 ORCA Proxy running on port ${PORT}`);
});

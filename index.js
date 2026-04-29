const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("💸 ORCA Donation Proxy (Ultra-Stable Build) Running");
});

// ===============================
// IMPROVED SAFE FETCH
// ===============================
async function safeFetch(url) {
    try {
        const res = await fetch(url, {
            headers: {
                // High-quality User-Agent makes the proxy look like a real person
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            console.log(`⚠️ RoProxy rejected request (Status: ${res.status}) - ${url}`);
            return null;
        }

        return await res.json();
    } catch (err) {
        console.log(`❌ Network error: ${err.message}`);
        return null;
    }
}

// ===============================
// STABLE COMBO FETCH
// ===============================
app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
    }

    console.log(`\n🔍 Fetching ALL items for user: ${userId}`);

    try {
        // We only use TWO URLs now. This prevents RoProxy rate-limiting.
        const CLOTHING_URL = `https://catalog.roproxy.com/v1/search/items/details?Category=3&Subcategory=3&CreatorTargetId=${userId}&CreatorType=User&Limit=30`;
        const GAMEPASS_URL = `https://catalog.roproxy.com/v1/search/items/details?Category=9&CreatorTargetId=${userId}&CreatorType=User&Limit=30`;

        // Run both fetches at the same time for speed
        const [clothingData, passData] = await Promise.all([
            safeFetch(CLOTHING_URL),
            safeFetch(GAMEPASS_URL)
        ]);

        let allItems = [];

        // Process Clothing
        if (clothingData && clothingData.data) {
            clothingData.data.forEach(item => {
                if (item.price && item.price > 0) {
                    allItems.push({
                        Id: item.id,
                        Name: item.name,
                        Type: "Clothing",
                        Price: item.price,
                        ImageId: item.id
                    });
                }
            });
        }

        // Process Gamepasses
        if (passData && passData.data) {
            passData.data.forEach(pass => {
                if (pass.price && pass.price > 0) {
                    allItems.push({
                        Id: pass.id,
                        Name: pass.name,
                        Type: "GamePass",
                        Price: pass.price,
                        ImageId: pass.id
                    });
                }
            });
        }

        // Sort: Cheapest first
        allItems.sort((a, b) => a.Price - b.Price);

        console.log(`✅ Success! Sent ${allItems.length} items to Roblox.`);
        return res.json(allItems);

    } catch (err) {
        console.log("❌ Server error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ORCA Proxy running on port ${PORT}`);
});

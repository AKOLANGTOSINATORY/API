const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("💸 ORCA Proxy (Strict User Mode) Live");
});

// Helper for RoProxy requests
async function safeFetch(url) {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" }
        });
        return res.ok ? await res.json() : null;
    } catch (err) {
        console.log(`❌ Fetch error: ${err.message}`);
        return null;
    }
}

app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;
    if (!userId || isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

    console.log(`\n👤 Searching personal items for User: ${userId}`);

    try {
        let allItems = [];

        // --- STEP 1: FETCH PERSONAL CLOTHING ---
        const clothingUrl = `https://catalog.roproxy.com/v1/search/items/details?Category=3&CreatorTargetId=${userId}&CreatorType=User&Limit=30`;
        const clothingData = await safeFetch(clothingUrl);
        
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

        // --- STEP 2: FETCH USER GAMES (UNIVERSES) ---
        const gamesUrl = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50`;
        const gamesData = await safeFetch(gamesUrl);

        if (gamesData && gamesData.data) {
            console.log(`🎮 Found ${gamesData.data.length} public games. Scanning for passes...`);
            
            for (const game of gamesData.data) {
                // FIXED: Added passView=Full to properly fetch the modern price structure
                const passUrl = `https://apis.roproxy.com/game-passes/v1/universes/${game.id}/game-passes?limit=100&passView=Full`;
                const passData = await safeFetch(passUrl);

                if (passData && passData.gamePasses) {
                    passData.gamePasses.forEach(pass => {
                        if (pass.isForSale) {
                            // FIXED: Extract price from priceInformation struct or fallback
                            let actualPrice = 0;
                            if (pass.priceInformation && pass.priceInformation.defaultPriceInRobux) {
                                actualPrice = pass.priceInformation.defaultPriceInRobux;
                            } else if (pass.price) {
                                actualPrice = pass.price;
                            }

                            allItems.push({
                                Id: pass.id,
                                Name: pass.name,
                                Type: "GamePass",
                                Price: actualPrice,
                                ImageId: pass.displayIconImageAssetId
                            });
                        }
                    });
                }
            }
        }

        // --- STEP 3: FILTER & SORT ---
        // Allow items with Price > 0, OR items that are GamePasses with Price === 0 (let the client fetch fallback prices)
        const donationItems = allItems.filter(i => i.Price > 0 || (i.Type === "GamePass" && i.Price === 0));
        donationItems.sort((a, b) => a.Price - b.Price);

        console.log(`✅ Sent ${donationItems.length} personal items to Studio.`);
        return res.json(donationItems);

    } catch (err) {
        console.log("❌ Server error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ORCA Proxy (USER-ONLY) running on port ${PORT}`);
});

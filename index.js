const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ORCA Donation Proxy is live!");
});

app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId" });
    }

    try {
        console.log(`Fetching items for User: ${userId}`);

        const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?CreatorTargetId=${userId}&CreatorType=User&Category=3&Limit=30`;
        
        const response = await fetch(catalogUrl);
        if (!response.ok) {
            throw new Error(`Roblox API returned status: ${response.status}`);
        }
        
        const catalogData = await response.json();

        const formattedItems = (catalogData.data || [])
            .filter(item => item.price > 0)
            .map(item => {
                return {
                    Id: item.id,
                    Name: item.name,
                    Type: "Product",
                    Price: item.price,
                    ImageId: item.id,
                    Owned: false
                };
            });

        return res.json(formattedItems);

    } catch (error) {
        console.error(`❌ Proxy Error for ${userId}:`, error.message);
        return res.status(500).json({ error: "Failed to fetch donation items" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💸 ORCA Proxy running on port ${PORT}`);
});

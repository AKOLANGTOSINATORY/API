const express = require("express");
const cors = require("cors");

const app = express();

// Allow requests from your Roblox server
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ORCA Donation Proxy is live!");
});

// The main endpoint to fetch a user's items
app.get("/api/items/:userId", async (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId" });
    }

    try {
        console.log(`Fetching items for User: ${userId}`);

        // Fetch user's created clothing from the Roblox Catalog API
        // Category 3 = Clothing. We fetch items created by this specific user.
        const catalogUrl = `https://catalog.roblox.com/v1/search/items/details?CreatorTargetId=${userId}&CreatorType=User&Category=3&Limit=30`;
        
        const response = await fetch(catalogUrl);
        if (!response.ok) {
            throw new Error(`Roblox API returned status: ${response.status}`);
        }
        
        const catalogData = await response.json();

        // Format the data exactly how our Roblox UILocalScript expects it
        const formattedItems = (catalogData.data || [])
            .filter(item => item.price > 0) // Only include items that actually cost Robux
            .map(item => {
                return {
                    Id: item.id,
                    Name: item.name,
                    Type: "Product", // Clothing items act like products for PromptPurchase
                    Price: item.price,
                    ImageId: item.id, // We'll let Roblox client handle the thumbnail resolving
                    Owned: false
                };
            });

        // Send the clean, formatted array back to your Roblox game
        return res.json(formattedItems);

    } catch (error) {
        console.error(`❌ Proxy Error for ${userId}:`, error.message);
        return res.status(500).json({ error: "Failed to fetch donation items" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💸 Donation Proxy running on port ${PORT}`);
});

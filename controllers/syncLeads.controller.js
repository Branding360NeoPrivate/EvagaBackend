import SyncLeads from "../modals/syncLeads.modal.js";

const createSyncLead = async (req, res) => {
    try {
        const { customerName, customerMobile, items } = req.body;

        if (!customerName || !customerMobile) {
            return res.status(400).json({ error: "customerName and customerMobile are required." });
        }

        // Generate a unique orderId
        const generateOrderId = () => "LD-" + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 6).toUpperCase();
        let orderId = generateOrderId();
        
        // Ensure uniqueness
        while (await SyncLeads.findOne({ orderId })) {
            orderId = generateOrderId();
        }

        let parsedItems = [];
        if (items && Array.isArray(items)) {
            parsedItems = items.map(item => {
                let statusVal = item.status || item.currentStatus || "pending";
                return {
                    name: item.name || item.itemName || "Unknown",
                    currentStatus: statusVal,
                    statusHistory: [
                        {
                            status: statusVal,
                            updatedBy: req.user && req.user._id ? String(req.user._id) : "system",
                            timestamp: new Date()
                        }
                    ]
                };
            });
        }

        const newLead = new SyncLeads({
            orderId,
            customerName,
            customerMobile,
            items: parsedItems
        });

        await newLead.save();

        return res.status(201).json({
            message: "Lead created successfully",
            lead: newLead
        });

    } catch (error) {
        console.error("Error in createSyncLead:", error);
        return res.status(500).json({ error: "Internal server error during lead creation." });
    }
};

const getAllSyncLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = (req.query.sort || "").toLowerCase();

        const skip = (page - 1) * limit;

        // "we will sort on createAt" - Default behavior
        let sortOptions = { createdAt: -1 };

        // "filter for sorting on a-z and z-a"
        if (sort === "a-z") {
            sortOptions = { customerName: 1 };
        } else if (sort === "z-a") {
            sortOptions = { customerName: -1 };
        }

        const totalCount = await SyncLeads.countDocuments();
        const leads = await SyncLeads.find()
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            leads,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount
        });
    } catch (error) {
        console.error("Error in getAllSyncLeads:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

const getOneSyncLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await SyncLeads.findById(id);

        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        return res.status(200).json(lead);
    } catch (error) {
        console.error("Error in getOneSyncLead:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

const updateOneSyncLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, status, ...updatedData } = req.body;

        const lead = await SyncLeads.findById(id);

        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        // Apply any valid top-level changes
        Object.assign(lead, updatedData);

        // Replace entire array if user passes an items array
        if (updatedData.items && Array.isArray(updatedData.items)) {
            lead.items = updatedData.items;
        }

        // Process itemName and status payload specifically for the items array
        if (itemName && status) {
            const existingItemIndex = lead.items.findIndex(item => item.name === itemName);
            const updatedBy = req.user && req.user._id ? String(req.user._id) : "system";

            if (existingItemIndex > -1) {
                // Update existing item status
                lead.items[existingItemIndex].currentStatus = status;
                lead.items[existingItemIndex].statusHistory.push({
                    status: status,
                    updatedBy: updatedBy,
                    timestamp: new Date()
                });
            } else {
                // Need to insert new item
                lead.items.push({
                    name: itemName,
                    currentStatus: status,
                    statusHistory: [
                        {
                            status: status,
                            updatedBy: updatedBy,
                            timestamp: new Date()
                        }
                    ]
                });
            }
        }

        await lead.save();

        return res.status(200).json({ message: "Lead updated successfully", lead: lead });
    } catch (error) {
        console.error("Error in updateOneSyncLead:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

const deleteOneSyncLead = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedLead = await SyncLeads.findByIdAndDelete(id);

        if (!deletedLead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        return res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
        console.error("Error in deleteOneSyncLead:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

const trackSyncLead = async (req, res) => {
    try {
        const { customerMobile } = req.body;

        const queryMobile = customerMobile;

        if (!queryMobile) {
            return res.status(400).json({ error: "Please provide customerMobile to track your order." });
        }

        const query = {};
        if (queryMobile) query.customerMobile = queryMobile;

        // Perform find just in case mobile number matches multiple orders
        // Exclude statusHistory and __v from the returned response
        const leads = await SyncLeads.find(query).select("-items.statusHistory -__v");

        if (!leads || leads.length === 0) {
            return res.status(404).json({ error: "No order found with the provided details." });
        }

        return res.status(200).json(leads);
    } catch (error) {
        console.error("Error in trackSyncLead:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export {
    createSyncLead,
    getAllSyncLeads,
    getOneSyncLead,
    updateOneSyncLead,
    deleteOneSyncLead,
    trackSyncLead
};

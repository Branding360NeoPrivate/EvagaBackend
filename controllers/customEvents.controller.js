import CustomEvent from "../modals/customEvents.model.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getS3KeyFromUrl = (url) => {
  if (!url) return null;
  try {
    if (url.includes(".amazonaws.com/")) {
      const parts = url.split(".amazonaws.com/");
      if (parts.length === 2) {
        return decodeURIComponent(parts[1]);
      }
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsedUrl = new URL(url);
      return decodeURIComponent(parsedUrl.pathname.substring(1));
    }
  } catch (error) {
    console.error("Error extracting S3 key:", error);
  }
  // Otherwise, assume it's already the exact key
  return url;
};
// Create a new custom event (ADMIN ONLY)
const createCustomEvent = async (req, res) => {
  try {
    const {
      eventType,
      tierType,
      title,
      description,
      age,
      gender,
      venueType,
      budget,
      peopleCapacity,
      addons,
      detail,
      contents,
      delivery,
      images,
      video,
    } = req.body;

    // Basic validation
    if (!eventType || !tierType || !title || !description || !detail || !contents || !delivery) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Handle uploaded images and videos
    let finalImages = images ? (typeof images === "string" ? JSON.parse(images) : images) : [];
    let finalVideo = video || "";

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.mimetype.startsWith("image/")) {
          finalImages.push(file.location);
        } else if (file.mimetype.startsWith("video/")) {
          finalVideo = file.location; // Assuming last video uploaded is the one
        }
      });
    }

    const customEvent = await CustomEvent.create({
      eventType,
      tierType,
      title,
      description,
      age,
      gender,
      venueType,
      budget,
      peopleCapacity,
      addons: typeof addons === "string" ? JSON.parse(addons) : addons,
      detail,
      contents,
      delivery,
      images: finalImages,
      video: finalVideo,
    });

    return res.status(201).json({
      success: true,
      message: "Custom event created successfully",
      data: customEvent,
    });
  } catch (error) {
    console.error("Error creating custom event:", error);
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation failed", details: validationErrors });
    }
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Get all custom events (with pagination and filters)
const getAllCustomEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, eventType, tierType, isActive, search } = req.query;

    const query = { isDeleted: false };

    if (eventType) query.eventType = eventType;
    if (tierType) query.tierType = tierType;
    if (isActive !== undefined) query.isActive = isActive === "true";

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { eventType: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [customEvents, total] = await Promise.all([
      CustomEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CustomEvent.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customEvents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting custom events:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get custom event by ID
const getCustomEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const customEvent = await CustomEvent.findById(id);

    if (!customEvent || customEvent.isDeleted) {
      return res.status(404).json({ error: "Custom event not found" });
    }

    return res.status(200).json({
      success: true,
      data: customEvent,
    });
  } catch (error) {
    console.error("Error getting custom event by ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update custom event
const updateCustomEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingEvent = await CustomEvent.findById(id);
    if (!existingEvent || existingEvent.isDeleted) {
      return res.status(404).json({ error: "Custom event not found" });
    }

    if (updateData.addons && typeof updateData.addons === "string") {
      updateData.addons = JSON.parse(updateData.addons);
    }

    // Robustly normalize images — middleware may produce strings, arrays, or nested arrays
    const rawImages = updateData.images;
    let incomingImages = [];
    if (Array.isArray(rawImages)) {
      // Flatten any nested arrays from middleware and keep only non-empty strings
      incomingImages = rawImages.flat(Infinity).filter(
        (img) => typeof img === "string" && img.trim().length > 0
      );
    } else if (typeof rawImages === "string" && rawImages.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawImages);
        incomingImages = Array.isArray(parsed)
          ? parsed.flat(Infinity).filter((img) => typeof img === "string" && img.trim().length > 0)
          : [];
      } catch {
        incomingImages = [];
      }
    } else if (typeof rawImages === "string" && rawImages.trim().length > 0) {
      incomingImages = [rawImages];
    }

    console.log("📥 incomingImages (normalized):", incomingImages);

    const existingImages = existingEvent.images || [];

    // Filter out removed images
    const removedImages = existingImages.filter((img) => !incomingImages.includes(img));

    let currentImages = [...incomingImages];
    let currentVideo = updateData.video !== undefined ? updateData.video : existingEvent.video;

    // Handle new uploaded images and videos
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.mimetype.startsWith("image/")) {
          currentImages.push(file.location);
        } else if (file.mimetype.startsWith("video/")) {
          currentVideo = file.location;
        }
      });
    }

    const removedVideo = existingEvent.video && existingEvent.video !== currentVideo ? existingEvent.video : null;

    updateData.images = currentImages;
    updateData.video = currentVideo;

    const updatedEvent = await CustomEvent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Delete removed images from S3
    for (const imgUrl of removedImages) {
      const key = getS3KeyFromUrl(imgUrl);
      if (key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.PUBLIC_BUCKET_NAME,
            Key: key,
          }));
          console.log("Deleted old image from S3:", key);
        } catch (err) {
          console.error("Failed to delete old image from S3:", key, err);
        }
      }
    }

    // Delete removed video from S3
    if (removedVideo) {
      const key = getS3KeyFromUrl(removedVideo);
      if (key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.PUBLIC_BUCKET_NAME,
            Key: key,
          }));
          console.log("Deleted old video from S3:", key);
        } catch (err) {
          console.error("Failed to delete old video from S3:", key, err);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Custom event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating custom event:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Toggle active status
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const customEvent = await CustomEvent.findById(id);

    if (!customEvent || customEvent.isDeleted) {
      return res.status(404).json({ error: "Custom event not found" });
    }

    customEvent.isActive = !customEvent.isActive;
    await customEvent.save();

    return res.status(200).json({
      success: true,
      message: `Custom event ${customEvent.isActive ? "activated" : "deactivated"} successfully`,
      data: customEvent,
    });
  } catch (error) {
    console.error("Error toggling active status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete custom event (soft delete)
const deleteCustomEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const customEvent = await CustomEvent.findById(id);

    if (!customEvent || customEvent.isDeleted) {
      return res.status(404).json({ error: "Custom event not found" });
    }

    customEvent.isDeleted = true;
    await customEvent.save();

    return res.status(200).json({
      success: true,
      message: "Custom event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting custom event:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get custom events by type
const getCustomEventsByType = async (req, res) => {
  try {
    const { eventType } = req.params;
    const customEvents = await CustomEvent.find({ eventType, isDeleted: false, isActive: true });

    return res.status(200).json({
      success: true,
      data: customEvents,
    });
  } catch (error) {
    console.error("Error getting custom events by type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Public: Get event details by ID
const getPublicEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const customEvent = await CustomEvent.findOne({ _id: id, isActive: true, isDeleted: false });

    if (!customEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      data: customEvent,
    });
  } catch (error) {
    console.error("Error getting public event details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Public: Get events by tierType
const getPublicEventsByTierType = async (req, res) => {
  try {
    const { tierType } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { tierType, isActive: true, isDeleted: false };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customEvents, total] = await Promise.all([
      CustomEvent.find(query)
        .select("title description budget images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CustomEvent.countDocuments(query),
    ]);

    const formattedEvents = customEvents.map((event) => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      budget: event.budget,
      image: event.images && event.images.length > 0 ? event.images[0] : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        customEvents: formattedEvents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.error("Error getting public events by tier type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export {
  createCustomEvent,
  getAllCustomEvents,
  getCustomEventById,
  updateCustomEvent,
  toggleActiveStatus,
  deleteCustomEvent,
  getCustomEventsByType,
  getPublicEventById,
  getPublicEventsByTierType,
};

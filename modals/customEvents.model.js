import mongoose from "mongoose";

const CustomEventSchema = new mongoose.Schema(
  {
    // Core Selection
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      default: "Birthday Party",
      trim: true,
    },
    tierType: {
      type: String,
      enum: ["Gold", "Premium", "Elite"],
      required: [true, "Tier/Type selection is required"],
    },

    // Event Details
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Short description is required"],
    },

    // Requirements & Capacity
    age: {
      type: String,
      required: [true, "Age criteria is required"],
    },
    gender: {
      type: String,
      enum: ["Any/All", "Male", "Female"],
      default: "Any/All",
    },
    venueType: {
      type: String,
      enum: ["Indoor", "Outdoor", "Both"],
      required: [true, "Venue type is required"],
    },
    budget: {
      type: String,
      required: [true, "Budget range is required"],
    },
    peopleCapacity: {
      type: String,
      required: [true, "People capacity is required"],
    },

    // Dynamic Add-ons
    addons: [
      {
        itemName: { type: String, required: true },
        price: { type: Number, required: true, default: 0 },
        minOrder: { type: Number, required: true, default: 1 },
      },
    ],

    // Rich Text / HTML Content (from React Quill)
    detail: {
      type: String,
      required: [true, "Event detail description is required"],
    },
    contents: {
      type: String,
      required: [true, "Package contents are required"],
    },
    delivery: {
      type: String,
      required: [true, "Delivery information is required"],
    },

    // Media (URLs stored after Cloudinary/S3 upload)
    images: [
      {
        type: String, // Array of image URLs
      },
    ],
    video: {
      type: String, // Single video URL
    },

    // Metadata & Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, // For Soft Delete functionality
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Middleware to skip deleted items in queries
CustomEventSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

CustomEventSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

export default mongoose.model("CustomEvent", CustomEventSchema);
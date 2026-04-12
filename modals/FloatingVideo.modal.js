import mongoose from "mongoose";

const floatingVideoSchema = new mongoose.Schema(
  {
    videoUrl: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tooltipText: {
      type: String,
      default: "✨ See how it works",
    },
    showTooltip: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FloatingVideo", floatingVideoSchema);

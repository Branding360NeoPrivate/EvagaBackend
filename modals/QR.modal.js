import mongoose from "mongoose";

const qrSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#000000",
    },
    qrCode: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("QR", qrSchema);

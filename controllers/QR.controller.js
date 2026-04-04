import QR from "../modals/QR.modal.js";
import QRCode from "qrcode";

// Generates a QR code base64 string
const generateQRCode = async (link, color) => {
  try {
    const options = {
      color: {
        dark: color || "#000000",
        light: "#FFFFFF",
      },
      width: 500,
      margin: 2,
    };
    const qrDataURL = await QRCode.toDataURL(link, options);
    return qrDataURL;
  } catch (err) {
    console.error("QR Code Generation Error:", err);
    throw new Error("Failed to generate QR code");
  }
};

export const createQR = async (req, res) => {
  try {
    const { title, link, color } = req.body;

    if (!title || !link) {
      return res.status(400).json({
        success: false,
        message: "Title and link are required",
      });
    }

    const qrCode = await generateQRCode(link, color);

    const newQR = new QR({
      title,
      link,
      color: color || "#000000",
      qrCode,
    });

    await newQR.save();

    res.status(201).json({
      success: true,
      message: "QR Code created successfully",
      data: newQR,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllQRs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await QR.countDocuments();
    const qrs = await QR.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: qrs.length,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
      data: qrs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOneQR = async (req, res) => {
  try {
    const { id } = req.params;
    const qr = await QR.findById(id);

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "QR Code not found",
      });
    }

    res.status(200).json({
      success: true,
      data: qr,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateQR = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link, color } = req.body;

    const existingQR = await QR.findById(id);
    if (!existingQR) {
      return res.status(404).json({
        success: false,
        message: "QR Code not found",
      });
    }

    // Update title if provided
    if (title) existingQR.title = title;

    // Regenerate QR code if link or color changes
    const shouldRegenerate = (link && link !== existingQR.link) || (color && color !== existingQR.color);

    if (link) existingQR.link = link;
    if (color) existingQR.color = color;

    if (shouldRegenerate) {
      existingQR.qrCode = await generateQRCode(existingQR.link, existingQR.color);
    }

    await existingQR.save();

    res.status(200).json({
      success: true,
      message: "QR Code updated successfully",
      data: existingQR,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteQR = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQR = await QR.findByIdAndDelete(id);

    if (!deletedQR) {
      return res.status(404).json({
        success: false,
        message: "QR Code not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "QR Code deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

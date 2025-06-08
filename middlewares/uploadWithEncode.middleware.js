import multer from "multer";
import multerS3 from "multer-s3";
import sharp from "sharp";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const memoryStorage = multer.memoryStorage();

export const uploadToS3WithEncoded = (folderName, allowedTypes) =>
  multer({
    storage: memoryStorage,
    fileFilter: fileFilter(allowedTypes),
  }).single("bannerImage");

export const processImagePreview = async (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    console.error("File buffer is missing.");
    req.file.preview = null;
    return next();
  }

  console.log(`Generating preview for: ${req.file.originalname}`);

  try {
    const resizedBuffer = await sharp(req.file.buffer)
      .resize(100, 100, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    req.file.preview = `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
    next();
  } catch (error) {
    console.error("Error generating preview:", error);
    req.file.preview = null;
    next();
  }
};



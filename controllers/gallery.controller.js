import Gallery from "../modals/gallery.model.js";

const createGallery = async (req, res) => {
  const galleryPreview = req.file?.preview || null;

  const galleryImage = req.file ? req.file.location : "";
  if (!galleryImage) {
    return res.status(400).json({ error: "Gallery Image is required" });
  }

  try {
    const newGalleryData = {
      originalImage: galleryImage,
      encodedImage: galleryPreview,
    };

    const newGallery = new Gallery(newGalleryData);
    await newGallery.save();

    res.status(201).json({ message: "Gallery Saved Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating Gallery", error });
  }
};


export { createGallery };

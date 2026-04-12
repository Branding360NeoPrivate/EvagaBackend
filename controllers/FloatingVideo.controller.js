import FloatingVideo from "../modals/FloatingVideo.modal.js";

export const getFloatingVideoConfig = async (req, res) => {
  try {
    let config = await FloatingVideo.findOne({ isDeleted: false });
    if (!config) {
      // Create default config if not exists
      config = new FloatingVideo({
        videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        isActive: true,
        tooltipText: "✨ See how it works",
        showTooltip: true,
      });
      await config.save();
    }
    res.status(200).json({ message: "Config fetched successfully", config });
  } catch (error) {
    res.status(500).json({ message: "Error fetching config", error: error.message });
  }
};

export const updateFloatingVideoConfig = async (req, res) => {
  const { videoUrl, isActive, tooltipText, showTooltip } = req.body;
  try {
    let config = await FloatingVideo.findOne({ isDeleted: false });
    if (!config) {
      config = new FloatingVideo({ videoUrl, isActive, tooltipText, showTooltip });
    } else {
      config.videoUrl = videoUrl !== undefined ? videoUrl : config.videoUrl;
      config.isActive = isActive !== undefined ? isActive : config.isActive;
      config.tooltipText = tooltipText !== undefined ? tooltipText : config.tooltipText;
      config.showTooltip = showTooltip !== undefined ? showTooltip : config.showTooltip;
    }
    await config.save();
    res.status(200).json({ message: "Config updated successfully", config });
  } catch (error) {
    res.status(500).json({ message: "Error updating config", error: error.message });
  }
};

export const deleteFloatingVideo = async (req, res) => {
  try {
    const config = await FloatingVideo.findOne({ isDeleted: false });
    if (!config) {
      return res.status(404).json({ message: "Config not found" });
    }
    config.isDeleted = true;
    await config.save();
    res.status(200).json({ message: "Config soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting config", error: error.message });
  }
};

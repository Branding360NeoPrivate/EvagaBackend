import OrderModel from "../modals/order.modal.js";

const getVendorOrders = async (req, res) => {
  const { vendorId } = req.params;

  if (!vendorId) {
    return res.status(400).json({ message: "Vendor ID is required" });
  }

  try {
    // Find orders where items array has an object with the specified vendorId
    const vendorOrders = await OrderModel.find({
      "items.vendorId": vendorId, // Filter by vendorId in items array
    });

    if (!vendorOrders || vendorOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this vendor" });
    }

    const separatedOrders = vendorOrders.flatMap((order) =>
      order.items
        .filter((item) => item.vendorId.toString() === vendorId)
        .map((item) => ({
          ...item.toObject(),
          orderId: order._id,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        }))
    );

    return res.status(200).json({ success: true, orders: separatedOrders });
  } catch (error) {
    console.error("Error fetching vendor orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export { getVendorOrders };

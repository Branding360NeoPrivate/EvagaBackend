import OrderModel from "../modals/order.modal.js";
import Vender from "../modals/vendor.modal.js";
import vendorServiceListingFormModal from "../modals/vendorServiceListingForm.modal.js";

const getUserOrder = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch orders by userId
    const userOrders = await OrderModel.find({ userId });

    if (!userOrders || userOrders.length === 0) {
      return res.status(200).json({ message: "No orders found for this user" });
    }

    const separatedOrders = [];

    for (const order of userOrders) {
      for (const item of order.items) {
        // Fetch vendor details
        const vendor = await Vender.findById(item.vendorId).select(
          "name email phone"
        );

        // Fetch service details
        const service = await vendorServiceListingFormModal.findById(
          item.serviceId
        );

        const packageDetails = service?.services.find(
          (pkg) => pkg._id.toString() === item.packageId.toString()
        );

        let extractedDetails = null;
        if (packageDetails?.values instanceof Map) {
          // Extract fields from Map
          extractedDetails = {
            Title:
              packageDetails.values.get("Title") ||
              packageDetails.values.get("VenueName") ||
              packageDetails.values.get("FoodTruckName"),
            CoverImage:
              packageDetails.values.get("CoverImage") ||
              packageDetails.values.get("ProductImage")?.[0],
          };
        } else if (packageDetails?.values) {
          extractedDetails = {
            Title:
              packageDetails.values.Title ||
              packageDetails.values.VenueName ||
              packageDetails.values.FoodTruckName,
            CoverImage:
              packageDetails.values.CoverImage ||
              packageDetails.values.ProductImage?.[0],
          };
        }

        // Add item with package and vendor details
        separatedOrders.push({
          ...item.toObject(), // Convert Mongoose object to plain object
          orderId: order._id,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          packageDetails: extractedDetails,
          vendorDetails: vendor, // Add vendor details here
        });
      }
    }

    return res.status(200).json({ success: true, orders: separatedOrders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const getSingleOrderItem = async (req, res) => {
  const { orderId, itemId } = req.params;

  if (!orderId || !itemId) {
    return res
      .status(400)
      .json({ message: "Order ID and Item ID are required" });
  }

  try {
    // Fetch the order by orderId
    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the specific item in the order's items array
    const item = order.items.find((i) => i._id.toString() === itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found in the order" });
    }

    // Calculate platform fees per item
    const itemCount = order.items.length;
    const platformFeePerItem = order.platformFee / itemCount;
    const platformGstPerItem = order.platformGstAmount / itemCount;

    // Fetch vendor details
    const vendor = await Vender.findById(item.vendorId).select(
      "name email phone"
    );

    // Fetch service details
    const service = await vendorServiceListingFormModal.findById(
      item.serviceId
    );

    const packageDetails = service?.services.find(
      (pkg) => pkg._id.toString() === item.packageId.toString()
    );

    let extractedDetails = null;
    if (packageDetails?.values instanceof Map) {
      // Extract fields from Map
      extractedDetails = {
        Title:
          packageDetails.values.get("Title") ||
          packageDetails.values.get("VenueName") ||
          packageDetails.values.get("FoodTruckName"),
      };
    } else if (packageDetails?.values) {
      extractedDetails = {
        FoodTruckName: packageDetails.values.FoodTruckName,
        VenueName: packageDetails.values.VenueName,
        Title: packageDetails.values.Title,
      };
    }

    // Construct the response for the specific item
    const response = {
      ...item.toObject(), // Convert Mongoose object to plain object
      orderId: order._id,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      packageDetails: extractedDetails,
      vendorDetails: vendor,
      platformFee: platformFeePerItem,
      platformGst: platformGstPerItem,
    };

    return res.status(200).json({ success: true, item: response });
  } catch (error) {
    console.error("Error fetching order item:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};


export { getUserOrder, getSingleOrderItem };

// import { Cashfree } from "cashfree-pg";
import OrderModel from "../modals/order.modal.js";

// export const validateOrder = async (req, res) => {
//   try {
//     const { orderId } = req.body;
//     if (!orderId) return res.status(400).json({ success: false, message: "Order ID is required" });

//     // Fetch order details from DB
//     const order = await OrderModel.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     // Validate payment status from Cashfree
//     const paymentStatus = await Cashfree.Order.fetch(order.cashfreeOrderId);

//     if (paymentStatus.order_status === "PAID") {
//       order.status = "SUCCESS";
//     } else if (paymentStatus.order_status === "FAILED") {
//       order.status = "FAILED";
//     }

//     await order.save();

//     res.json({ success: true, status: order.status });
//   } catch (error) {
//     console.error("Error validating order:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

import Razorpay from "razorpay";
import crypto from "crypto";
import Cart from "../modals/Cart.modal.js";
import addOrderToVendorCalendor from "./vendorCalendor.controller.js";
import { generateInvoice } from "../utils/generateInvoice.js";
import { sendEmail } from "../utils/emailService.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const validateOrder = async (req, res) => {
  try {
    const { orderId, paymentId, razorpaySignature } = req.body;
    const userId = req.user?._id;
    console.log(userId, req.user);

    if (!orderId || !paymentId || !razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Fetch order details from DB
    const order = await OrderModel.findOne({ razorPayOrderId: orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ✅ **Step 1: Verify Razorpay Payment Signature**
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // ✅ **Step 2: Fetch Payment Status from Razorpay**
    const paymentDetails = await razorpay.payments.fetch(paymentId);

    if (paymentDetails.status === "captured") {
      order.status = "CONFIRMED";
      order.paymentStatus = "SUCCESS";
    } else if (paymentDetails.status === "failed") {
      order.status = "CANCELLED";
      order.paymentStatus = "FAILED";
    } else {
      order.status = "PENDING";
      order.paymentStatus = "PENDING";
    }

    await order.save();
    const cart = await Cart.findOneAndDelete({ userId: userId });
    res.json({ success: true, status: order.status });
    if (order.status === "CONFIRMED") {
      const invoiceBuffer = await generateInvoice(order); // Generate the invoice as a buffer

      // Send the email with the invoice attached
      const emailResponse = await sendEmail(
        "armanal3066@gmail.com", // Assuming you have `customerEmail` in the order
        "Your Order Invoice",
        "Thank you for your order! Please find your invoice attached.",
        {
          attachments: [
            {
              filename: `Invoice-${order._id}.pdf`,
              content: invoiceBuffer,
            },
          ],
        }
      );

      console.log("Invoice email sent successfully:", emailResponse);
    }
  } catch (error) {
    console.error("Error validating order:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

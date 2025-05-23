import OrderModel from "../modals/order.modal.js";

import Razorpay from "razorpay";
import crypto from "crypto";
import Cart from "../modals/Cart.modal.js";
import addOrderToVendorCalendor from "./vendorCalendor.controller.js";
import { generateInvoice } from "../utils/generateInvoice.js";
import { sendEmail } from "../utils/emailService.js";
import User from "../modals/user.modal.js";
import { addOrderToCalendar } from "./sendNotificationToCalendar.js";
import { createEvent } from "../createEvent.js";
import Vender from "../modals/vendor.modal.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const validateOrder = async (req, res) => {
  try {
    const { orderId, paymentId, razorpaySignature } = req.body;
    const userId = req.user?._id;

    if (!orderId || !paymentId || !razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const order = await OrderModel.findOne({ razorPayOrderId: orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const paymentDetails = await razorpay.payments.fetch(paymentId);

    if (paymentDetails.status === "captured") {
      order.status = "CONFIRMED";
      order.paymentStatus = "SUCCESS";
    } else if (paymentDetails.status === "failed") {
      order.status = "CANCELLED";
      order.paymentStatus = "FAILED";
      order.items.forEach((item) => {
        item.orderStatus = "cancelled";
      });
    } else {
      order.status = "PENDING";
      order.paymentStatus = "PENDING";
    }

    await order.save();
    const cart = await Cart.findOneAndDelete({ userId: userId });
    res.json({ success: true, status: order.status });
    if (order.status === "CONFIRMED") {
      const paymentMethodDetails = await razorpay.payments.fetch(paymentId);

      if (paymentMethodDetails) {
        const paymentDetails = {
          method:
            paymentMethodDetails.method === "emi"
              ? "emi"
              : paymentMethodDetails.method,
          details: {},
        };

        if (
          paymentMethodDetails.method === "card" &&
          paymentMethodDetails.card
        ) {
          paymentDetails.details = {
            last4: paymentMethodDetails.card.last4,
            network: paymentMethodDetails.card.network,
            type: paymentMethodDetails.card.type,
          };
        } else if (
          paymentMethodDetails.method === "upi" &&
          paymentMethodDetails.upi?.vpa
        ) {
          paymentDetails.details = {
            upiId: paymentMethodDetails.upi.vpa,
          };
        } else if (
          paymentMethodDetails.method === "wallet" &&
          paymentMethodDetails.wallet
        ) {
          paymentDetails.details = {
            walletName: paymentMethodDetails.wallet,
          };
        } else if (
          paymentMethodDetails.method === "netbanking" &&
          paymentMethodDetails.bank
        ) {
          paymentDetails.details = {
            bankName: paymentMethodDetails.bank,
          };
        } else if (paymentMethodDetails.method === "emi") {
          paymentDetails.details = {};
        }

        order.paymentDetails = paymentDetails;
        await order.save();
      }
      const user = await User.findById(order.userId);
      const invoiceBuffer = await generateInvoice(order);

      for (const item of order.items) {
        const bookingData = {
          vendor: item.vendorId,
          startTime: item.time,
          startDate: item.date,
          bookedByVendor: false,
          user: order.userId,
          address: order.address,
        };

        try {
          const bookingResult = await addOrderToVendorCalendor(bookingData);
        } catch (error) {
          console.error(
            `Failed to book calendar for vendor ${item.vendorId}:`,
            error
          );
        }
      }

      for (const item of order.items) {
        const vendor = await Vender.findById(item.vendorId);
        if (!vendor) {
          console.error(`Vendor not found for ID: ${item.vendorId}`);
          continue;
        }

        const startDate = new Date(item.date);
        const [hours, minutes] = item.time.split(":").map(Number);
        startDate.setHours(hours, minutes);

        const eventDetails = {
          summary: `New Order Received From Eevagga`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: new Date(
              startDate.getTime() + 60 * 60 * 1000
            ).toISOString(),
            timeZone: "Asia/Kolkata",
          },
          attendees: [{ email: vendor.email }],
        };

        await createEvent(eventDetails);
      }
    }
  } catch (error) {
    console.error("Error validating order:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

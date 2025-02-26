import PDFDocument from "pdfkit";
import User from "../modals/user.modal.js";
import vendorServiceListingFormModal from "../modals/vendorServiceListingForm.modal.js";

export const generateInvoice = (order) => {
  const doc = new PDFDocument();
  const buffers = [];

  return new Promise(async (resolve, reject) => {
    const user = await User.findById(order.userId);
    const customerName = user?.name || "Unknown Customer";
    const itemDetails = await Promise.all(
      order.items.map(async (item) => {
        const service = await vendorServiceListingFormModal.findById(
          item.serviceId
        );
        const packageDetails = service?.services.find(
          (pkg) => pkg._id.toString() === item.packageId.toString()
        );

        let extractedDetails = null;
        if (packageDetails?.values instanceof Map) {
          extractedDetails = {
            Title:
              packageDetails.values.get("Title") ||
              packageDetails.values.get("VenueName") ||
              packageDetails.values.get("FoodTruckName"),
          };
        } else if (packageDetails?.values) {
          extractedDetails = {
            Title:
              packageDetails.values.Title ||
              packageDetails.values.VenueName ||
              packageDetails.values.FoodTruckName,
          };
        }

        return {
          name: extractedDetails?.Title || "Unknown Item",
          quantity: item.selectedSessions.reduce(
            (acc, session) => acc + (session.quantity || 0),
            0
          ),
          price: item.totalPrice,
          gst: item.gstAmount,
          gstPercentage: item.gstPercentage,
        };
      })
    );

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Customer Name: ${customerName}`);
    doc.text(
      `Order Date: ${new Date(order.createdAt.$date).toLocaleDateString()}`
    );
    doc.text(`Order ID: ${order.OrderId}`);
    doc.text(
      `Address: ${order.address.name}, ${order.address.address}, ${order.address.addressLine1}, ${order.address.addressLine2}, ${order.address.state} - ${order.address.pinCode}`
    );
    doc.moveDown();

    // Table header
    doc.fontSize(12).text("Item Details:", { underline: true });
    doc.moveDown(0.5);

    // Item details
    itemDetails.forEach((item) => {
      doc.text(
        `${item.name} (x${item.quantity}) - ₹${item.price.toFixed(2)} | GST (${
          item.gstPercentage
        }%): ₹${item.gst.toFixed(2)}`
      );
    });
    doc.moveDown();

    // Totals
    const totalCGST = order.totalGst / 2;
    const totalSGST = order.totalGst / 2;

    doc
      .fontSize(14)
      .text(`Subtotal: ₹${(order.totalAmount - order.totalGst).toFixed(2)}`);
    doc.text(`CGST (9%): ₹${totalCGST.toFixed(2)}`);
    doc.text(`SGST (9%): ₹${totalSGST.toFixed(2)}`);
    doc.text(`Platform Fee: ₹${order.platformFee.toFixed(2)}`);
    doc.text(`Platform GST: ₹${order.platformGstAmount.toFixed(2)}`);
    doc.moveDown();
    doc.text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, {
      align: "right",
    });

    doc.end();
  });
};

import bookingCTA from "../modals/bookingCTA.js";
import { Parser } from "json2csv";
import { sendEmail } from "../utils/emailService.js";
// import sendEmailWithTemplete from "../utils/mailer.js";
// import { sendTemplateMessage } from "./wati.controller.js";
// Create new booking
export const createBooking = async (req, res) => {
  try {
    const booking = await bookingCTA.create(req.body);
    res.status(201).json({
      success: true,
      data: booking,
    });
    await sendEmail(
      "thankyou",
      booking?.email,
      "Thank You for Reaching Out to Eevagga!"
    );
    await sendEmail(
      "adminCtaNotification",
      "info@evagaentertainment.com",
      "New Booking Form Submission - Eevagga",
      {
        name: booking?.name,
        email: booking?.email,
        phone: booking?.phone,
        eventType: booking?.eventType,
        preferredDate: booking?.eventMonth,
        pageCatgeory: booking?.pageCatgeory,
        sku: booking?.sku,
      }
    );
    // await sendTemplateMessage(booking?.phone, "form_filling_enquiry_res", []);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all bookings (for admin)
export const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    let query = {};

    // Add search functionality for phone and email
    if (search) {
      query = {
        $or: [
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const bookings = await bookingCTA
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await bookingCTA.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Mark as read (admin)
export const markAsRead = async (req, res) => {
  try {
    const booking = await bookingCTA.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    booking.isRead = !booking.isRead;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Download bookings CSV by date filter
export const downloadBookingsCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Please provide both startDate and endDate",
      });
    }

    // Set time to start and end of day to make it inclusive
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const query = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    const bookings = await bookingCTA.find(query).sort({ createdAt: -1 });

    const fields = [
      "name",
      "email",
      "phone",
      "eventType",
      "eventMonth",
      "eventLocation",
      "pageCatgeory",
      "sku",
      "isRead",
      "createdAt",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(bookings);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bookings_${startDate}_to_${endDate}.csv`
    );

    res.status(200).end(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate CSV",
      error: error.message,
    });
  }
};

import PDFDocument from "pdfkit";
import Order from "../models/order.model.js";
import Address from "../models/address.model.js";

const generateInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email phone")
      .populate("products.productId", "name price discount");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Allow owner or admin
    const isOwner = order.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get user's most recent address (invoice billing/shipping info)
    const address = await Address.findOne({ userId: order.userId._id }).sort({ updatedAt: -1 });

    // Create PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set response headers
    const invoiceNumber = `INV-${order._id.toString().slice(-8).toUpperCase()}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${invoiceNumber}.pdf`);
    doc.pipe(res);

    // ─── HEADER ───
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("INVOICE", 50, 50)
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text(invoiceNumber, 50, 80)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 50, 95);

    // Status badge
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text(`Status: ${order.status.toUpperCase()}`, 400, 55, { align: "right" });

    // Order ID
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Order ID: ${order._id}`, 400, 70, { align: "right" })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 400, 85, { align: "right" });

    // ─── DIVIDER ───
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .strokeColor("#e5e7eb")
      .stroke();

    // ─── BILLING / SHIPPING ───
    let yPos = 140;

    // Bill To
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#999999")
      .text("BILL TO", 50, yPos);

    yPos += 15;
    const userName = `${order.userId.firstName || ""} ${order.userId.lastName || ""}`.trim();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#111111")
      .text(userName || "Customer", 50, yPos);

    yPos += 16;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#555555");

    if (order.userId.email) {
      doc.text(order.userId.email, 50, yPos);
      yPos += 13;
    }
    if (order.userId.phone) {
      doc.text(order.userId.phone, 50, yPos);
      yPos += 13;
    }

    // Ship To (if address exists)
    if (address) {
      let shipY = 140;
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#999999")
        .text("SHIP TO", 320, shipY);

      shipY += 15;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#111111")
        .text(address.fullName || userName, 320, shipY);

      shipY += 14;
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#555555");

      if (address.houseNo) {
        doc.text(address.houseNo, 320, shipY);
        shipY += 12;
      }
      if (address.area) {
        doc.text(address.area, 320, shipY);
        shipY += 12;
      }
      if (address.landmark) {
        doc.text(`Near: ${address.landmark}`, 320, shipY);
        shipY += 12;
      }
      doc.text(`${address.city}, ${address.state} - ${address.pinCode}`, 320, shipY);
      shipY += 12;
      doc.text(address.country || "India", 320, shipY);
      shipY += 12;
      if (address.phone) {
        doc.text(`Ph: ${address.phone}`, 320, shipY);
      }

      yPos = Math.max(yPos, shipY) + 10;
    }

    yPos += 10;

    // ─── TABLE HEADER ───
    doc
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .strokeColor("#e5e7eb")
      .stroke();

    yPos += 10;

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#999999");

    doc.text("#", 50, yPos, { width: 25 });
    doc.text("ITEM", 75, yPos, { width: 220 });
    doc.text("VARIANT", 295, yPos, { width: 80 });
    doc.text("QTY", 375, yPos, { width: 40, align: "center" });
    doc.text("UNIT PRICE", 415, yPos, { width: 60, align: "right" });
    doc.text("TOTAL", 480, yPos, { width: 65, align: "right" });

    yPos += 18;

    doc
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .strokeColor("#e5e7eb")
      .stroke();

    yPos += 10;

    // ─── TABLE ROWS ───
    doc.font("Helvetica").fillColor("#333333");

    order.products.forEach((item, index) => {
      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      const productName = item.productId?.name || "Product";
      const unitPrice = Math.round(item.price / item.quantity);
      const lineTotal = item.price;

      doc.fontSize(9).fillColor("#333333");
      doc.text(`${index + 1}`, 50, yPos, { width: 25 });
      doc.text(productName, 75, yPos, { width: 220 });
      doc.fontSize(8).fillColor("#777777");
      doc.text(item.variantLabel || "—", 295, yPos, { width: 80 });
      doc.fontSize(9).fillColor("#333333");
      doc.text(`${item.quantity}`, 375, yPos, { width: 40, align: "center" });
      doc.text(`₹${unitPrice.toLocaleString("en-IN")}`, 415, yPos, { width: 60, align: "right" });
      doc.font("Helvetica-Bold");
      doc.text(`₹${lineTotal.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });
      doc.font("Helvetica");

      yPos += 22;
    });

    // ─── TOTALS ───
    yPos += 5;
    doc
      .moveTo(350, yPos)
      .lineTo(545, yPos)
      .strokeColor("#e5e7eb")
      .stroke();

    yPos += 12;

    const baseSubtotal = order.subTotal || (order.totalAmount + (order.couponDiscount || 0));

    // Subtotal
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Subtotal:", 350, yPos, { width: 130, align: "right" })
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text(`₹${baseSubtotal.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });

    yPos += 18;

    // Regular discount
    if (order.regularDiscount && order.regularDiscount > 0) {
      doc
        .font("Helvetica")
        .fillColor("#16a34a")
        .text("Product Discount:", 350, yPos, { width: 130, align: "right" })
        .font("Helvetica-Bold")
        .text(`-₹${order.regularDiscount.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });
      yPos += 18;
    }

    // Flash sale discount
    if (order.flashSaleDiscount && order.flashSaleDiscount > 0) {
      doc
        .font("Helvetica")
        .fillColor("#e11d48")
        .text("Flash Sale Savings:", 350, yPos, { width: 130, align: "right" })
        .font("Helvetica-Bold")
        .text(`-₹${order.flashSaleDiscount.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });
      yPos += 18;
    }

    // Bundle
    if (order.bundleDiscount && order.bundleDiscount > 0) {
      doc
        .font("Helvetica")
        .fillColor("#4f46e5")
        .text("Bundle Offer Savings:", 350, yPos, { width: 130, align: "right" })
        .font("Helvetica-Bold")
        .text(`-₹${order.bundleDiscount.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });
      yPos += 18;
    }

    // Coupon discount
    if (order.couponDiscount && order.couponDiscount > 0) {
      doc
        .font("Helvetica")
        .fillColor("#16a34a")
        .text(`Coupon (${order.couponCode || 'Applied'}):`, 350, yPos, { width: 130, align: "right" })
        .font("Helvetica-Bold")
        .text(`-₹${order.couponDiscount.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });

      yPos += 18;
    }

    // Total
    doc
      .moveTo(350, yPos)
      .lineTo(545, yPos)
      .strokeColor("#333333")
      .lineWidth(1.5)
      .stroke();

    yPos += 10;

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#111111")
      .text("TOTAL:", 350, yPos, { width: 130, align: "right" })
      .text(`₹${order.totalAmount.toLocaleString("en-IN")}`, 480, yPos, { width: 65, align: "right" });

    // ─── FOOTER ───
    const footerY = 750;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor("#e5e7eb")
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999999")
      .text("This is a computer-generated invoice and does not require a signature.", 50, footerY + 10, {
        align: "center",
        width: 495,
      })
      .text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 50, footerY + 22, {
        align: "center",
        width: 495,
      });

    doc.end();
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error generating invoice" });
  }
};

export { generateInvoice };

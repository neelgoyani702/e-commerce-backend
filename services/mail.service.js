import nodemailer from "nodemailer";

// ─── Shared template helpers ────────────────────────────────────────────────
const BRAND_COLOR = "#6366f1";
const BRAND_NAME  = "ShopEasy";

function baseTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f8fafc; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:600px; margin:32px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.06); }
    .header { background:${BRAND_COLOR}; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-0.5px; }
    .header p  { margin:6px 0 0; color:rgba(255,255,255,.75); font-size:13px; }
    .body { padding:36px 40px; }
    .body h2 { color:#111; font-size:18px; margin:0 0 8px; }
    .body p  { color:#64748b; font-size:14px; line-height:1.6; margin:0 0 16px; }
    .table { width:100%; border-collapse:collapse; margin:20px 0; }
    .table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; padding:8px 12px; border-bottom:2px solid #f1f5f9; }
    .table td { padding:12px; border-bottom:1px solid #f8fafc; font-size:13px; color:#334155; vertical-align:middle; }
    .table td.amount { font-weight:700; text-align:right; color:#111; }
    .badge { display:inline-block; padding:4px 12px; border-radius:32px; font-size:12px; font-weight:600; }
    .badge-green  { background:#dcfce7; color:#16a34a; }
    .badge-blue   { background:#dbeafe; color:#2563eb; }
    .badge-amber  { background:#fef3c7; color:#d97706; }
    .badge-indigo { background:#e0e7ff; color:${BRAND_COLOR}; }
    .cta { display:inline-block; margin:20px 0 0; padding:12px 28px; background:${BRAND_COLOR}; color:#fff !important; text-decoration:none; border-radius:10px; font-weight:600; font-size:14px; }
    .info-box { background:#f8fafc; border-radius:10px; padding:16px 20px; margin:16px 0; font-size:13px; color:#475569; line-height:1.6; }
    .info-box strong { color:#111; }
    .divider { border:none; border-top:1px solid #f1f5f9; margin:24px 0; }
    .footer { padding:24px 40px; background:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
    .total-row td { font-size:15px; font-weight:700; color:#111; border-top:2px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🛍️ ${BRAND_NAME}</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br/>
      This email was sent from an automated notification system.
    </div>
  </div>
</body>
</html>`;
}

function itemRows(products = []) {
  return products.map(item => {
    const name = item.productId?.name || item.name || "Product";
    const price = (item.price || 0).toLocaleString("en-IN");
    const qty = item.quantity || 1;
    const variant = item.variantLabel ? `<br/><span style="color:#94a3b8;font-size:11px">${item.variantLabel}</span>` : "";
    return `<tr>
      <td>${name}${variant}</td>
      <td style="text-align:center">${qty}</td>
      <td class="amount">₹${price}</td>
    </tr>`;
  }).join("");
}

// ─── Template 1a: Order Placed (when user places order) ─────────────────────
export function orderPlacedEmail(order, user) {
  const items = itemRows(order.products);
  const content = `
    <h2>Order Placed! 🛒</h2>
    <p>Hi ${user?.firstName || "there"}, your order has been received! We'll confirm it shortly and start preparing it for delivery.</p>
    <span class="badge badge-indigo">Order Placed</span>
    <p style="margin-top:12px;font-size:12px;color:#94a3b8">Order ID: <strong style="color:#111">#${order._id}</strong></p>
    <table class="table">
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>
        ${items}
        <tr class="total-row"><td colspan="2">Total</td><td class="amount">₹${(order.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
      </tbody>
    </table>
    <p>Estimated delivery: <strong>${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" }) : "3–5 business days"}</strong></p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">Track My Order →</a>
  `;
  return baseTemplate("Order Placed", content);
}

// ─── Template 1b: Order Confirmed (when admin confirms) ─────────────────────
export function orderConfirmedEmail(order, user) {
  const content = `
    <h2>Order Confirmed! ✅</h2>
    <p>Hi ${user?.firstName || "there"}, great news — your order <strong>#${order._id}</strong> has been confirmed and is now being prepared!</p>
    <span class="badge badge-green">Confirmed</span>
    <p style="margin-top:16px">We'll notify you again once your order is packed and shipped.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">Track My Order →</a>
  `;
  return baseTemplate("Order Confirmed", content);
}

// ─── Template 1c: Out for Delivery ──────────────────────────────────────────
export function orderOutForDeliveryEmail(order, user) {
  const content = `
    <h2>Out for Delivery! 📍</h2>
    <p>Hi ${user?.firstName || "there"}, your order <strong>#${order._id}</strong> is out for delivery and will reach you today!</p>
    <span class="badge badge-amber">Out for Delivery</span>
    <div class="info-box" style="margin-top:16px;">
      <strong>Tip:</strong> Please keep your phone handy — the delivery agent may contact you.
    </div>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">Track My Order →</a>
  `;
  return baseTemplate("Out for Delivery", content);
}

// ─── Template 2: Order Shipped ──────────────────────────────────────────────
export function orderShippedEmail(order, user) {
  const content = `
    <h2>Your order is on its way! 🚚</h2>
    <p>Hi ${user?.firstName || "there"}, great news — your order <strong>#${order._id}</strong> has been shipped and is heading to you.</p>
    <span class="badge badge-blue">Shipped</span>
    <div class="info-box" style="margin-top:16px;">
      <strong>Estimated Delivery:</strong> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" }) : "2–3 business days"}<br/>
      ${order.statusHistory?.find(s => s.status === "shipped")?.note ? `<strong>Note:</strong> ${order.statusHistory.find(s => s.status === "shipped").note}` : ""}
    </div>
    <p>You can track your order status in real time from the link below.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">Track My Order →</a>
  `;
  return baseTemplate("Your Order Has Been Shipped", content);
}

// ─── Template 3: Order Delivered ────────────────────────────────────────────
export function orderDeliveredEmail(order, user) {
  const content = `
    <h2>Order Delivered! 🎁</h2>
    <p>Hi ${user?.firstName || "there"}, your order <strong>#${order._id}</strong> has been delivered. We hope you love your purchase!</p>
    <span class="badge badge-green">Delivered</span>
    <hr class="divider"/>
    <p>If you're happy with your order, we'd love to hear from you. Please take a moment to leave a review!</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/order-history" class="cta">Leave a Review →</a>
    <hr class="divider"/>
    <p style="font-size:12px;color:#94a3b8">If you have any issues, you can raise a return/refund request through your order history within 7 days.</p>
  `;
  return baseTemplate("Your Order Has Been Delivered", content);
}

// ─── Template 4a: Return Request Placed ─────────────────────────────────────
export function returnPlacedEmail(returnReq, user) {
  const content = `
    <h2>Return Request Submitted 📋</h2>
    <p>Hi ${user?.firstName || "there"}, we've received your return request. Our team will review it and get back to you shortly.</p>
    <span class="badge badge-indigo">Under Review</span>
    <div class="info-box" style="margin-top:16px;">
      <strong>Return ID:</strong> #${returnReq._id}<br/>
      <strong>Reason:</strong> ${returnReq.reason || "—"}<br/>
      <strong>Items:</strong> ${returnReq.items?.length || 0} item(s)<br/>
      <strong>Expected Refund:</strong> ₹${(returnReq.refundAmount || 0).toLocaleString("en-IN")}
    </div>
    <p>We typically process return requests within <strong>24–48 hours</strong>.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">View My Returns →</a>
  `;
  return baseTemplate("Return Request Submitted", content);
}

// ─── Template 4b: Return Approved ───────────────────────────────────────────
export function returnApprovedEmail(returnReq, user) {
  const content = `
    <h2>Return Approved ✅</h2>
    <p>Hi ${user?.firstName || "there"}, your return request has been approved.</p>
    <span class="badge badge-green">Approved</span>
    <div class="info-box" style="margin-top:16px;">
      <strong>Return ID:</strong> #${returnReq._id}<br/>
      <strong>Reason:</strong> ${returnReq.reason || "—"}<br/>
      <strong>Refund Amount:</strong> ₹${(returnReq.refundAmount || 0).toLocaleString("en-IN")}
    </div>
    <p>Your refund will be processed to your original payment method within <strong>5–7 business days</strong>.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/order-history" class="cta">View Order History →</a>
  `;
  return baseTemplate("Return Request Approved", content);
}

// ─── Template 4c: Return Rejected ───────────────────────────────────────────
export function returnRejectedEmail(returnReq, user) {
  const adminNote = returnReq.adminNote || "";
  const content = `
    <h2>Return Request Declined 😔</h2>
    <p>Hi ${user?.firstName || "there"}, unfortunately your return request <strong>#${returnReq._id}</strong> has been declined.</p>
    <span class="badge" style="background:#fee2e2;color:#dc2626;">Rejected</span>
    ${adminNote ? `<div class="info-box" style="margin-top:16px;"><strong>Reason:</strong> ${adminNote}</div>` : ""}
    <p>If you believe this was a mistake, please contact our support team for further assistance.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/orders" class="cta">View My Orders →</a>
  `;
  return baseTemplate("Return Request Declined", content);
}

// ─── Template 4d: Refund Processed ──────────────────────────────────────────
export function returnRefundedEmail(returnReq, user) {
  const content = `
    <h2>Refund Processed! 💰</h2>
    <p>Hi ${user?.firstName || "there"}, your refund for return request <strong>#${returnReq._id}</strong> has been processed.</p>
    <span class="badge badge-green">Refunded</span>
    <div class="info-box" style="margin-top:16px;">
      <strong>Refund Amount:</strong> ₹${(returnReq.refundAmount || 0).toLocaleString("en-IN")}<br/>
      <strong>Method:</strong> Original payment method
    </div>
    <p>The amount should reflect in your account within <strong>3–5 business days</strong> depending on your bank.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/profile/order-history" class="cta">View Order History →</a>
  `;
  return baseTemplate("Refund Processed", content);
}

// ─── Template 5b: Order Cancelled ───────────────────────────────────────────
export function orderCancelledEmail(order, user, cancelledBy = "customer") {
  const items = itemRows(order.products);
  const note = order.statusHistory?.find(h => h.status === "cancelled")?.note || "";
  const content = `
    <h2>Order Cancelled ❌</h2>
    <p>Hi ${user?.firstName || "there"}, your order <strong>#${order._id}</strong> has been cancelled${cancelledBy === "admin" ? " by the store admin" : ""}.</p>
    <span class="badge" style="background:#fee2e2;color:#dc2626;">Cancelled</span>
    ${note ? `<div class="info-box" style="margin-top:16px;"><strong>Reason:</strong> ${note}</div>` : ""}
    <table class="table">
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>
        ${items}
        <tr class="total-row"><td colspan="2">Refund Amount</td><td class="amount">₹${(order.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
      </tbody>
    </table>
    <p>If you paid online, your refund will be processed within <strong>5–7 business days</strong>.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/products" class="cta">Continue Shopping →</a>
  `;
  return baseTemplate("Order Cancelled", content);
}

// ─── Template 6: Back-in-Stock Alert ────────────────────────────────────────
export function stockAlertEmail(product, userEmail) {
  const content = `
    <h2>It's Back in Stock! 🔔</h2>
    <p>Great news! A product on your watchlist is available again.</p>
    <div class="info-box">
      ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;float:left;margin-right:16px;" />` : ""}
      <strong style="font-size:15px">${product.name}</strong><br/>
      <span style="color:#16a34a;font-weight:600;font-size:14px">₹${(product.price || 0).toLocaleString("en-IN")}</span>
      ${product.discount > 0 ? `<span style="margin-left:8px;font-size:12px;color:#d97706">–${product.discount}% off</span>` : ""}
      <div style="clear:both"></div>
    </div>
    <p>Hurry, stock is limited! Add it to your cart before it runs out again.</p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/product/${product._id}" class="cta">Shop Now →</a>
    <hr class="divider"/>
    <p style="font-size:12px;color:#94a3b8">You received this because you opted into back-in-stock notifications for this product.</p>
  `;
  return baseTemplate("Your Wishlist Item Is Back in Stock", content);
}

// ─── Core sendEmail function ─────────────────────────────────────────────────
export async function sendEmail(to, subject, htmlContent) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`[mail] Sent "${subject}" → ${to}`);
  } catch (err) {
    // Non-fatal — log but don't crash the request
    console.error(`[mail] Failed to send "${subject}" → ${to}:`, err.message);
  }
}

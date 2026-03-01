import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "product_created",
        "product_updated",
        "product_deleted",
        "category_created",
        "category_updated",
        "category_deleted",
        "order_status_updated",
        "user_role_updated",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ["product", "category", "order", "user"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    targetName: {
      type: String,
    },
    details: {
      type: String,
    },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
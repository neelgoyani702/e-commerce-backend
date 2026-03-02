import Address from "../models/address.model.js";
import User from "../models/user.model.js";

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: user, message: "User found" });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to get user",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        firstName,
        lastName,
        phone,
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json({ message: "User updated successfully", user: user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Unable to update user" });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user?._id);
    const isMatch = await user.checkPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to change user password",
    });
  }
};

const addAddress = async (req, res) => {
  try {
    const { fullName, phone, houseNo, area, landmark, pinCode, city, state, country } = req.body;

    if (!area || !city || !state || !pinCode) {
      return res.status(400).json({ message: "Area, city, state, and pin code are required" });
    }

    const address = {
      userId: req.user?._id,
      fullName,
      phone,
      houseNo,
      area,
      landmark,
      pinCode,
      city,
      state,
      country,
    };

    const newAddress = await Address.create(address);

    return res
      .status(201)
      .json({ message: "Address added successfully", address: newAddress });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to add address",
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { fullName, phone, houseNo, area, landmark, pinCode, city, state, country } = req.body;

    // Verify ownership
    const existingAddress = await Address.findById(req.params.id);
    if (!existingAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (existingAddress.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to update this address" });
    }

    const address = await Address.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        phone,
        houseNo,
        area,
        landmark,
        pinCode,
        city,
        state,
        country,
      },
      { new: true }
    );

    return res
      .status(200)
      .json({ message: "Address updated successfully", address: address });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to update address",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    // Verify ownership
    const existingAddress = await Address.findById(req.params.id);
    if (!existingAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (existingAddress.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this address" });
    }

    await Address.findByIdAndDelete(req.params.id);

    return res
      .status(200)
      .json({ message: "Address deleted successfully", address: existingAddress });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to delete address",
    });
  }
};

const getAddress = async (req, res) => {
  try {
    const address = await Address.find({ userId: req.user?._id });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    return res
      .status(200)
      .json({ message: "Address fetched successfully", address: address });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to get address",
    });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const index = user.wishlist.indexOf(productId);
    let action;

    if (index > -1) {
      // Already in wishlist — remove
      user.wishlist.splice(index, 1);
      action = "removed";
    } else {
      // Not in wishlist — add
      user.wishlist.push(productId);
      action = "added";
    }

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: action === "added" ? "Added to wishlist" : "Removed from wishlist",
      wishlist: user.wishlist,
      action,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Error updating wishlist",
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "wishlist",
      select: "name price image discount stock category",
      populate: { path: "category", select: "name" },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Wishlist fetched successfully",
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Error fetching wishlist",
    });
  }
};

export {
  getUser,
  updateUser,
  changeUserPassword,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddress,
  toggleWishlist,
  getWishlist,
};

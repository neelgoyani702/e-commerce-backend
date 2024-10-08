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

    console.log(req.user);

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

    console.log(address);

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

    console.log("hello is delete");
    

    const deletedAddress = await Address.findByIdAndDelete(req.params.id);
    console.log("deletedAddress",deletedAddress);
    
    if (!deletedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    console.log("deleteaddress found");
    
    return res
      .status(200)
      .json({ message: "Address deleted successfully", address: deletedAddress });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Unable to delete address",
    });
  }
}

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

export {
  getUser,
  updateUser,
  changeUserPassword,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddress,
};

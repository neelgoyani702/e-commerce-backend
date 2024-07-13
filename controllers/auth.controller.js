import User from "../models/user.model.js";

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    console.log(req.body);

    if (!(email && password && firstName && lastName)) {
      return res.status(400).json({ message: "All input is required" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "sorry a user with this email already exists" });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
    });

    await newUser.save();

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error while register" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    if (!(email && password)) {
      return res.status(400).json({ message: "All input is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "user not found, please check your email and password",
      });
    }

    const isPasswordMatch = user.checkPassword(password);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // const loggedInUser = await User.findById(user._id).select("-password");

    const token = await user.generateToken();

    const options = {
      httpOnly: true,
      secure: true,
      maxAge: 3600 * 24 * 7,
      sameSite: "strict",
    };

    res.cookie("token", token, options);

    return res
      .status(200)
      .json({ token: token, user: user, message: "login successful" });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "error while login" });
  }
};

const logoutUser = async (req, res) => {
  try {
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .clearCookie("token", options)
      .status(200)
      .json({ message: "logout successful" });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "error while logout" });
  }
};

export { createUser, loginUser, logoutUser };

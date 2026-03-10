import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";

cloudinary.config({
  cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`,
  api_key: `${process.env.CLOUDINARY_API_KEY}`,
  api_secret: `${process.env.CLOUDINARY_API_SECRET}`,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null; // if no file, return

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: "e_commerce",
      resource_type: "auto",
    });

    // Verify the response has a valid URL
    if (!response || !response.url) {
      console.error("Cloudinary upload returned no URL:", response);
      if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      return null;
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message || error);
    // remove the locally saved temporary file as the upload operation failed
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return "where is imageUrl"; // if no file, return

    const publicId = extractPublicId(imageUrl);
    // delete the file from cloudinary
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    return error;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };

import multer from "multer";

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/category");
  },
  //   destination: "uploads/category",
  filename: (req, file, cb) => {
    // file size must be less than 5MB
    if (file.size > 1024 * 1024 * 5) {
      return cb("File size is greater than 5MB", null);
    }
    cb(null, Date.now() + file.originalname);
  },
});
const multerCategoryUpload = multer({ storage: categoryStorage });

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/product");
  },
  //   destination: "uploads/category",
  filename: (req, file, cb) => {
    // file size must be less than 5MB
    if (file.size > 1024 * 1024 * 5) {
      return cb("File size is greater than 5MB", null);
    }
    cb(null, Date.now() + file.originalname);
  },
});

const multerProductUpload = multer({ storage: productStorage });

export { multerCategoryUpload, multerProductUpload };

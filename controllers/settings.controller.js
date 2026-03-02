import StoreSettings from "../models/storeSettings.model.js";

// Public — anyone can read store settings (needed for footer/navbar)
const getStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }
    return res.status(200).json({ message: "Settings fetched", settings });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching settings" });
  }
};

// Admin only — update store settings
const updateStoreSettings = async (req, res) => {
  try {
    const {
      storeName,
      tagline,
      currency,
      currencySymbol,
      primaryColor,
      accentColor,
      contactEmail,
      contactPhone,
      address,
      socialLinks,
    } = req.body;

    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings();
    }

    if (storeName !== undefined) settings.storeName = storeName;
    if (tagline !== undefined) settings.tagline = tagline;
    if (currency !== undefined) settings.currency = currency;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
    if (primaryColor !== undefined) settings.primaryColor = primaryColor;
    if (accentColor !== undefined) settings.accentColor = accentColor;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (address !== undefined) settings.address = address;
    if (socialLinks !== undefined) settings.socialLinks = socialLinks;

    const updated = await settings.save();
    return res
      .status(200)
      .json({ message: "Settings updated", settings: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating settings" });
  }
};

export { getStoreSettings, updateStoreSettings };

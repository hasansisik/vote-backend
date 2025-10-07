const Settings = require("../models/Settings");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get System Settings
const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSystemSettings();

    res.status(StatusCodes.OK).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// Get Enabled Languages Only (Public endpoint)
const getEnabledLanguages = async (req, res, next) => {
  try {
    const enabledLanguages = await Settings.getEnabledLanguages();

    res.status(StatusCodes.OK).json({
      success: true,
      languages: enabledLanguages,
    });
  } catch (error) {
    next(error);
  }
};

// Update System Settings (Admin only)
const updateSettings = async (req, res, next) => {
  try {
    const { languages, general } = req.body;

    let settings = await Settings.findById("system");

    if (!settings) {
      settings = await Settings.getSystemSettings();
    }

    // Update languages if provided
    if (languages) {
      if (languages.availableLanguages) {
        // Validate that at least one language is enabled
        const hasEnabledLanguage = languages.availableLanguages.some(
          (lang) => lang.enabled
        );

        if (!hasEnabledLanguage) {
          throw new CustomError.BadRequestError(
            "En az bir dil aktif olmalıdır."
          );
        }

        // Validate that default language is enabled
        const defaultLangEnabled = languages.availableLanguages.find(
          (lang) =>
            lang.code ===
            (languages.defaultLanguage || settings.languages.defaultLanguage)
        )?.enabled;

        if (!defaultLangEnabled) {
          throw new CustomError.BadRequestError(
            "Varsayılan dil aktif olmalıdır."
          );
        }

        settings.languages.availableLanguages = languages.availableLanguages;
      }

      if (languages.defaultLanguage) {
        // Check if default language is enabled
        const isEnabled = settings.languages.availableLanguages.find(
          (lang) => lang.code === languages.defaultLanguage
        )?.enabled;

        if (!isEnabled) {
          throw new CustomError.BadRequestError(
            "Varsayılan dil olarak seçilen dil aktif olmalıdır."
          );
        }

        settings.languages.defaultLanguage = languages.defaultLanguage;
      }
    }

    // Update general settings if provided
    if (general) {
      if (general.siteName) settings.general.siteName = general.siteName;
      if (general.siteDescription)
        settings.general.siteDescription = general.siteDescription;
      if (typeof general.maintenanceMode === "boolean")
        settings.general.maintenanceMode = general.maintenanceMode;
    }

    // Track who updated
    settings.lastUpdatedBy = req.user.userId;

    await settings.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Sistem ayarları başarıyla güncellendi.",
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Language Status (Admin only)
const toggleLanguage = async (req, res, next) => {
  try {
    const { languageCode } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      throw new CustomError.BadRequestError("'enabled' alanı gereklidir.");
    }

    const settings = await Settings.getSystemSettings();

    const langIndex = settings.languages.availableLanguages.findIndex(
      (lang) => lang.code === languageCode
    );

    if (langIndex === -1) {
      throw new CustomError.NotFoundError("Dil bulunamadı.");
    }

    // If disabling, check if it's the default language
    if (!enabled && settings.languages.defaultLanguage === languageCode) {
      throw new CustomError.BadRequestError(
        "Varsayılan dil devre dışı bırakılamaz."
      );
    }

    // If disabling, check if there will be at least one language enabled
    if (!enabled) {
      const enabledCount = settings.languages.availableLanguages.filter(
        (lang) => lang.enabled
      ).length;

      if (enabledCount <= 1) {
        throw new CustomError.BadRequestError(
          "En az bir dil aktif olmalıdır."
        );
      }
    }

    settings.languages.availableLanguages[langIndex].enabled = enabled;
    settings.lastUpdatedBy = req.user.userId;

    await settings.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${settings.languages.availableLanguages[langIndex].name} dili ${enabled ? "aktif" : "pasif"} edildi.`,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// Update Default Language (Admin only)
const updateDefaultLanguage = async (req, res, next) => {
  try {
    const { languageCode } = req.body;

    if (!languageCode) {
      throw new CustomError.BadRequestError("Dil kodu gereklidir.");
    }

    const settings = await Settings.getSystemSettings();

    const language = settings.languages.availableLanguages.find(
      (lang) => lang.code === languageCode
    );

    if (!language) {
      throw new CustomError.NotFoundError("Dil bulunamadı.");
    }

    if (!language.enabled) {
      throw new CustomError.BadRequestError(
        "Pasif bir dil varsayılan dil olarak ayarlanamaz."
      );
    }

    settings.languages.defaultLanguage = languageCode;
    settings.lastUpdatedBy = req.user.userId;

    await settings.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Varsayılan dil ${language.name} olarak güncellendi.`,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  getEnabledLanguages,
  updateSettings,
  toggleLanguage,
  updateDefaultLanguage,
};


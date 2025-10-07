const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    // Sistem genelinde tek bir settings dokümanı olacak
    // _id her zaman "system" olacak
    _id: {
      type: String,
      default: "system",
    },
    // Dil ayarları
    languages: {
      availableLanguages: [
        {
          code: {
            type: String,
            required: true,
            enum: ["tr", "en", "de", "fr"],
          },
          name: {
            type: String,
            required: true,
          },
          flag: {
            type: String,
            required: true,
          },
          enabled: {
            type: Boolean,
            default: true,
          },
        },
      ],
      defaultLanguage: {
        type: String,
        default: "tr",
        enum: ["tr", "en", "de", "fr"],
      },
    },
    // Gelecekte eklenebilecek diğer ayarlar
    general: {
      siteName: {
        type: String,
        default: "Vote App",
      },
      siteDescription: {
        type: String,
        default: "Vote management application",
      },
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
    },
    // Güncelleme bilgisi
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Sistem ayarlarını getir veya oluştur
SettingsSchema.statics.getSystemSettings = async function () {
  let settings = await this.findById("system");

  if (!settings) {
    // İlk kez oluşturuluyorsa, varsayılan değerlerle oluştur
    settings = await this.create({
      _id: "system",
      languages: {
        availableLanguages: [
          { code: "tr", name: "Türkçe", flag: "🇹🇷", enabled: true },
          { code: "en", name: "English", flag: "🇬🇧", enabled: true },
          { code: "de", name: "Deutsch", flag: "🇩🇪", enabled: true },
          { code: "fr", name: "Français", flag: "🇫🇷", enabled: true },
        ],
        defaultLanguage: "tr",
      },
    });
  }

  return settings;
};

// Aktif dilleri getir
SettingsSchema.statics.getEnabledLanguages = async function () {
  const settings = await this.getSystemSettings();
  return settings.languages.availableLanguages.filter((lang) => lang.enabled);
};

const Settings = mongoose.model("Settings", SettingsSchema);

module.exports = Settings;


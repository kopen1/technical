export const samsungA52Case = {
  id: "samsung-a52-a525f-charging-001",

  device: {
    brand: "Samsung",
    model: "A52",
    variant: "A525F"
  },

  symptom: {
    category: "charging",
    description: "Tidak bisa dicas"
  },

  faultGroup: "charging_ovp_path",

  steps: [
    {
      id: "check-vbus-input",
      title: "Ukur VBUS",
      inputType: "voltage",
      unit: "V",
      testPoint: "VBUS",
      expected: {
        min: 4.5,
        max: 5.5
      }
    },

    {
      id: "check-vbus-after-ovp",
      title: "Ukur tegangan setelah OVP",
      inputType: "voltage",
      unit: "V",
      testPoint: "AFTER_OVP"
    }
  ],

  verification: [
    "Logo charging muncul",
    "Current charging terdeteksi",
    "Persentase baterai meningkat"
  ]
};


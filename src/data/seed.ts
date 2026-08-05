export type CaseSource = "verified" | "community" | "external" | "unknown";
export type CaseStatus = "draft" | "review" | "published" | "archived";

export type DiagnosticCase = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  symptom: string;
  faultGroup: string;
  title: string;
  summary: string;
  source?: CaseSource;
  status?: CaseStatus;
  steps: Array<{
    id: string;
    title: string;
    instruction: string;
    method: "observation" | "voltage" | "resistance" | "diode" | "continuity" | "current" | "thermal";
    testPoint?: string;
  }>;
};

export const SEED_CASES: DiagnosticCase[] = [
  {
    id: "sam-a52-charge",
    slug: "samsung-a52-a525f-tidak-bisa-charging",
    brand: "Samsung",
    model: "A52 A525F",
    symptom: "Tidak bisa charging",
    faultGroup: "charging",
    title: "Samsung A52 A525F — Tidak Bisa Charging",
    summary: "Kasus pemeriksaan charging dengan VBUS dan jalur setelah OVP.",
    source: "community",
    steps: [
      { id:"s1", title:"Periksa VBUS", instruction:"Ukur tegangan VBUS pada test point yang sesuai schematic.", method:"voltage", testPoint:"VBUS" },
      { id:"s2", title:"Periksa setelah OVP", instruction:"Bandingkan tegangan sebelum dan sesudah OVP.", method:"voltage", testPoint:"AFTER_OVP" },
      { id:"s3", title:"Verifikasi charging", instruction:"Cek logo charging, arus dan kenaikan persentase.", method:"observation" }
    ]
  },
  {
    id: "vivo-y19s-short",
    slug: "vivo-y19s-4g-mati-total-vdd1v85-short",
    brand: "Vivo",
    model: "Y19s 4G",
    symptom: "Mati total",
    faultGroup: "power_short",
    title: "Vivo Y19s 4G — VDD1V85 Short",
    summary: "Kasus short pada rail VDD1V85 yang dikonfirmasi dengan sumber panas.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur VDD1V85", instruction:"Ukur rail VDD1V85 dan catat nilai aktual.", method:"resistance", testPoint:"VDD1V85" },
      { id:"s2", title:"Konfirmasi sumber panas", instruction:"Gunakan thermal/rosin secara aman untuk mencari komponen yang panas.", method:"thermal" },
      { id:"s3", title:"Verifikasi setelah tindakan", instruction:"Ukur ulang rail lalu tes power.", method:"observation" }
    ]
  },
  {
    id: "redmi-note8-vph",
    slug: "redmi-note-8-mati-total-vph-pwr",
    brand: "Xiaomi",
    model: "Redmi Note 8",
    symptom: "Mati total",
    faultGroup: "power_path",
    title: "Redmi Note 8 — VPH_PWR",
    summary: "Pemeriksaan USB_VBUS dan VPH_PWR untuk memetakan power path.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur USB_VBUS", instruction:"Ukur USB_VBUS pada test point sesuai board.", method:"voltage", testPoint:"USB_VBUS" },
      { id:"s2", title:"Ukur VPH_PWR", instruction:"Ukur VPH_PWR dan bandingkan dengan reference yang terverifikasi.", method:"voltage", testPoint:"VPH_PWR" },
      { id:"s3", title:"Verifikasi boot", instruction:"Tes charging dan boot setelah tindakan perbaikan.", method:"observation" }
    ]
  },
  {
    id: "redmi9-restart",
    slug: "redmi-9-restart-rf-mb2-tx-rfic",
    brand: "Xiaomi",
    model: "Redmi 9",
    symptom: "Restart terus",
    faultGroup: "network_rf",
    title: "Redmi 9 — Restart Terus",
    summary: "Kasus restart dengan pemeriksaan jalur network/RF.",
    source: "community",
    steps: [
      { id:"s1", title:"Pastikan gejala", instruction:"Tes power tanpa bergantung pada tombol power flexibel untuk memastikan pola restart.", method:"observation" },
      { id:"s2", title:"Periksa jalur RF", instruction:"Periksa jalur sesuai schematic/reference board.", method:"resistance", testPoint:"RF_MB2_TX_RFIC" },
      { id:"s3", title:"Verifikasi", instruction:"Tes boot, masuk menu dan cek sinyal.", method:"observation" }
    ]
  },
  {
    id: "sam-a326-lcd",
    slug: "samsung-a326-5g-lcd-blank",
    brand: "Samsung",
    model: "A326 5G",
    symptom: "LCD blank hitam",
    faultGroup: "display_mipi",
    title: "Samsung A32 5G A326 — LCD Blank",
    summary: "Pemeriksaan jalur MIPI display setelah penggantian LCD.",
    source: "community",
    steps: [
      { id:"s1", title:"Uji LCD pembanding", instruction:"Uji LCD yang diketahui baik dan bandingkan gejala.", method:"observation" },
      { id:"s2", title:"Ukur jalur MIPI", instruction:"Ukur jalur MIPI connector sesuai schematic/reference.", method:"diode", testPoint:"MIPI_DSI0_CLK_N / MIPI_DSI0_D1_P" },
      { id:"s3", title:"Verifikasi display", instruction:"Tes kembali display setelah tindakan.", method:"observation" }
    ]
  },
  {
    id: "vivo-y12s-power",
    slug: "vivo-y12s-mtk-mati-total-power-short",
    brand: "Vivo",
    model: "Y12s MTK",
    symptom: "Mati total / short",
    faultGroup: "power_short",
    title: "Vivo Y12s MTK — Power Short",
    summary: "Lokalisasi short memakai respons arus dan thermal.",
    source: "community",
    steps: [
      { id:"s1", title:"Amati respons arus", instruction:"Catat respons USB Doctor/PSU.", method:"current" },
      { id:"s2", title:"Cari area panas", instruction:"Lokalisasi area panas dengan thermal.", method:"thermal" },
      { id:"s3", title:"Telusuri rail", instruction:"Ikuti coil/rail berdasarkan schematic/reference.", method:"observation" },
      { id:"s4", title:"Verifikasi", instruction:"Ukur ulang lalu tes power.", method:"observation" }
    ]
  },
  {
    id: "sam-a315-audio",
    slug: "samsung-a31-a315-tidak-ada-suara",
    brand: "Samsung",
    model: "A31 A315",
    symptom: "Tidak ada suara",
    faultGroup: "audio",
    title: "Samsung A31 A315 — Tidak Ada Suara",
    summary: "Pemeriksaan jalur speaker dan suplai audio IC pada kasus tanpa suara.",
    source: "community",
    steps: [
      { id:"s1", title:"Cek kontinuitas speaker", instruction:"Ukur kontinuitas speaker SPK+/SPK- dan pastikan tidak open/short.", method:"continuity", testPoint:"SPK+ / SPK-" },
      { id:"s2", title:"Ukur suplai audio IC", instruction:"Ukur tegangan suplai audio IC pada test point VDD_AUDIO.", method:"voltage", testPoint:"VDD_AUDIO" },
      { id:"s3", title:"Verifikasi audio", instruction:"Tes suara dengan file uji setelah tindakan.", method:"observation" }
    ]
  },
  {
    id: "redmi9-wifi",
    slug: "xiaomi-redmi-9-wifi-bluetooth-mati",
    brand: "Xiaomi",
    model: "Redmi 9",
    symptom: "Wifi/Bluetooth mati",
    faultGroup: "network_rf",
    title: "Xiaomi Redmi 9 — Wifi/Bluetooth Mati",
    summary: "Pemeriksaan suplai RFIC dan jalur antena wifi/BT.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur suplai wifi", instruction:"Ukur tegangan VDD_WIFI pada area RFIC.", method:"voltage", testPoint:"VDD_WIFI" },
      { id:"s2", title:"Cek antena", instruction:"Periksa kontinuitas jalur antena wifi/BT sesuai reference board.", method:"continuity", testPoint:"ANT_WIFI_BT" },
      { id:"s3", title:"Verifikasi", instruction:"Tes wifi dan bluetooth setelah tindakan.", method:"observation" }
    ]
  },
  {
    id: "oppo-a54-overheat",
    slug: "oppo-a54-panas-berlebihan",
    brand: "Oppo",
    model: "A54",
    symptom: "Panas berlebihan",
    faultGroup: "overheat",
    title: "Oppo A54 — Panas Berlebihan",
    summary: "Lokalisasi sumber panas dan pemeriksaan rail daya.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur VBAT", instruction:"Ukur resistansi rail VBAT untuk deteksi short.", method:"resistance", testPoint:"VBAT" },
      { id:"s2", title:"Thermal scan", instruction:"Lakukan thermal scan untuk menemukan komponen yang panas.", method:"thermal" },
      { id:"s3", title:"Verifikasi", instruction:"Ukur ulang dan tes pemakaian normal.", method:"observation" }
    ]
  },
  {
    id: "realme-c11-nosignal",
    slug: "realme-c11-tidak-ada-sinyal",
    brand: "Realme",
    model: "C11",
    symptom: "Tidak ada sinyal",
    faultGroup: "network_rf",
    title: "Realme C11 — Tidak Ada Sinyal",
    summary: "Pemeriksaan jalur RF dari antena hingga transceiver.",
    source: "community",
    steps: [
      { id:"s1", title:"Cek antena switch", instruction:"Periksa kontinuitas antena switch RF sesuai schematic.", method:"continuity", testPoint:"RF_SW" },
      { id:"s2", title:"Ukur jalur TX", instruction:"Ukur jalur TX power amp ke transceiver.", method:"resistance", testPoint:"PA_TX" },
      { id:"s3", title:"Verifikasi sinyal", instruction:"Tes signal di menu *#*#4636#*#* atau mode service.", method:"observation" }
    ]
  },
  {
    id: "sam-a51-slowcharge",
    slug: "samsung-a51-charging-lambat",
    brand: "Samsung",
    model: "A51",
    symptom: "Charging lambat",
    faultGroup: "charging",
    title: "Samsung A51 — Charging Lambat",
    summary: "Pemeriksaan arus charging dan jalur charging IC. Referensi dari dokumentasi servis.",
    source: "external",
    steps: [
      { id:"s1", title:"Ukur arus charging", instruction:"Catat arus yang masuk lewat USB Doctor/PSU.", method:"current", testPoint:"USB_VBUS" },
      { id:"s2", title:"Cek charging IC", instruction:"Bandingkan tegangan input-output charging IC.", method:"voltage", testPoint:"CHG_IC_VBUS" },
      { id:"s3", title:"Cek konektor baterai", instruction:"Periksa kontinuitas konektor baterai.", method:"continuity", testPoint:"BAT_CONN" },
      { id:"s4", title:"Verifikasi", instruction:"Tes charging normal dan cek persentase naik.", method:"observation" }
    ]
  },
  {
    id: "infinix-hot10-nopower",
    slug: "infinix-hot10-mati-total",
    brand: "Infinix",
    model: "Hot 10",
    symptom: "Mati total",
    faultGroup: "power_path",
    title: "Infinix Hot 10 — Mati Total",
    summary: "Pemeriksaan alur daya dari baterai hingga PMIC.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur VBAT", instruction:"Ukur tegangan baterai pada konektor.", method:"voltage", testPoint:"VBAT" },
      { id:"s2", title:"Ukur output PMIC", instruction:"Ukur output utama PMIC.", method:"voltage", testPoint:"PMIC_VOUT_MAIN" },
      { id:"s3", title:"Cek power button", instruction:"Periksa kontinuitas jalur power button.", method:"continuity", testPoint:"PWR_KEY" },
      { id:"s4", title:"Verifikasi", instruction:"Tes power dan masuk menu setelah tindakan.", method:"observation" }
    ]
  },
  {
    id: "iphone7-audioic",
    slug: "iphone-7-loop-restart-audio-ic",
    brand: "Apple",
    model: "iPhone 7",
    symptom: "Restart saat ada getar",
    faultGroup: "audio",
    title: "iPhone 7 — Loop Restart Audio IC",
    summary: "Kasus klasik Audio IC pada iPhone 7 yang sering menyebabkan restart.",
    source: "external",
    steps: [
      { id:"s1", title:"Ukur suplai audio IC", instruction:"Ukur tegangan VDD_AUDIO pada area audio IC.", method:"voltage", testPoint:"VDD_AUDIO" },
      { id:"s2", title:"Ukur jalur I2S", instruction:"Ukur diode mode jalur I2S audio IC ke SoC.", method:"diode", testPoint:"I2S0_MCLK" },
      { id:"s3", title:"Rework audio IC", instruction:"Lakukan rework/replacement audio IC sesuai prosedur.", method:"observation" },
      { id:"s4", title:"Verifikasi", instruction:"Tes getar, panggilan dan boot berulang.", method:"observation" }
    ]
  },
  {
    id: "vivo-v20-wifi",
    slug: "vivo-v20-wifi-bluetooth-mati",
    brand: "Vivo",
    model: "V20",
    symptom: "Wifi/Bluetooth mati",
    faultGroup: "network_rf",
    title: "Vivo V20 — Wifi/Bluetooth Tidak Aktif",
    summary: "Pemeriksaan suplai RFIC dan jalur antena wifi/BT.",
    source: "community",
    steps: [
      { id:"s1", title:"Ukur suplai RFIC", instruction:"Ukur tegangan VDD_RFIC.", method:"voltage", testPoint:"VDD_RFIC" },
      { id:"s2", title:"Cek antena wifi/BT", instruction:"Periksa kontinuitas jalur antena.", method:"continuity", testPoint:"ANT_WIFI_BT" },
      { id:"s3", title:"Verifikasi", instruction:"Tes toggle wifi dan bluetooth.", method:"observation" }
    ]
  },
  {
    id: "poco-x3-camera",
    slug: "xiaomi-poco-x3-kamera-tidak-terdeteksi",
    brand: "Xiaomi",
    model: "Poco X3",
    symptom: "Kamera tidak terdeteksi",
    faultGroup: "camera",
    title: "Xiaomi Poco X3 — Kamera Tidak Terdeteksi",
    summary: "Pemeriksaan konektor kamera dan suplai power kamera.",
    source: "community",
    steps: [
      { id:"s1", title:"Cek konektor kamera", instruction:"Periksa kontinuitas konektor kamera dan fleksibel.", method:"continuity", testPoint:"CAM_CONN" },
      { id:"s2", title:"Ukur suplai kamera", instruction:"Ukur rail tegangan kamera (IOVDD/AVDD).", method:"voltage", testPoint:"CAM_IOVDD" },
      { id:"s3", title:"Verifikasi", instruction:"Tes buka kamera di aplikasi setelah tindakan.", method:"observation" }
    ]
  },
  {
    id: "sam-a12-usb",
    slug: "samsung-a12-usb-tidak-terdeteksi",
    brand: "Samsung",
    model: "A12",
    symptom: "USB tidak terdeteksi / tidak charging",
    faultGroup: "charging",
    title: "Samsung A12 — USB Tidak Terdeteksi",
    summary: "Pemeriksaan konektor USB, jalur data dan VBUS.",
    source: "external",
    steps: [
      { id:"s1", title:"Cek konektor USB", instruction:"Periksa kontinuitas jalur data USB D+/D-.", method:"continuity", testPoint:"USB_D+ / USB_D-" },
      { id:"s2", title:"Ukur VBUS", instruction:"Ukur tegangan VBUS pada konektor.", method:"voltage", testPoint:"VBUS" },
      { id:"s3", title:"Ukur VBAT", instruction:"Ukur tegangan baterai untuk pastikan jalur charging.", method:"resistance", testPoint:"VBAT" },
      { id:"s4", title:"Verifikasi", instruction:"Tes deteksi USB di PC dan charging.", method:"observation" }
    ]
  }
];
export type DiagnosticCase = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  symptom: string;
  faultGroup: string;
  title: string;
  summary: string;
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
    steps: [
      { id:"s1", title:"Amati respons arus", instruction:"Catat respons USB Doctor/PSU.", method:"current" },
      { id:"s2", title:"Cari area panas", instruction:"Lokalisasi area panas dengan thermal.", method:"thermal" },
      { id:"s3", title:"Telusuri rail", instruction:"Ikuti coil/rail berdasarkan schematic/reference.", method:"observation" },
      { id:"s4", title:"Verifikasi", instruction:"Ukur ulang lalu tes power.", method:"observation" }
    ]
  }
];
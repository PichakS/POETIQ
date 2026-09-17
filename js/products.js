/* Poetiq — Forest Bathing Collection product + scent data.
   Prices and SKUs are the real 2026 series lineup from the brand's
   Shopee/live-stream catalogue. Update here to change site-wide. */

const POETIQ_PRODUCTS = [
  {
    id: "aroma-candle",
    name: "Aroma Candle",
    size: "100 ml",
    price: 490,
    tone: "moss",
    desc: "A slow-burning soy candle for quiet evenings at home.",
  },
  {
    id: "hill-tribe-room-spray",
    name: "Hill Tribe Room Spray",
    size: "30 ml",
    price: 490,
    tone: "indigo",
    desc: "An instant mist for the room, inspired by highland air.",
  },
  {
    id: "car-aroma-perfume",
    name: "Car Aroma Perfume",
    size: "10 ml",
    price: 289,
    tone: "almond",
    desc: "A clip-on scent for the everyday commute.",
  },
  {
    id: "hill-tribe-reed-diffuser",
    name: "Hill Tribe Reed Diffuser",
    size: "45 ml",
    price: 590,
    tone: "plum",
    desc: "Continuous fragrance through natural reed sticks.",
  },
  {
    id: "aroma-stone-sachet",
    name: "Aroma Stone Sachet",
    size: "70 g",
    price: 590,
    tone: "moss",
    desc: "ถุงหอมอโรม่า — scented stones for drawers and closets.",
  },
  {
    id: "fragrance-aroma-oil",
    name: "Fragrance Aroma Oil",
    size: "15 ml",
    price: 390,
    tone: "indigo",
    desc: "Concentrated oil for your own diffuser or burner.",
  },
  {
    id: "wild-reed-diffuser",
    name: "Wild Reed Diffuser",
    size: "150 ml",
    price: 890,
    tone: "almond",
    desc: "The full-size diffuser for living rooms and entryways.",
  },
];

const POETIQ_SCENTS = [
  "First Rain Tea",
  "Morning Ritual",
  "Wild White Tea",
  "Lanna Lantern",
  "Mist by the Lake",
  "The Poet's Garden",
  "Way to the Hill",
  "Willow in the Valley",
  "The Rice Season",
  "The Hidden Kingdom",
  "Holiday Brunch",
  "The Weaver's House",
  "The Coachman's Trail",
];

function poetiqFormatBaht(amount) {
  return "฿" + amount.toLocaleString("en-US");
}

/* Poetiq — product + scent data.
   Prices/sizes sourced from the 20-May-2026 ICONSIAM retail price
   submission (source of truth) — confirmed with Gammpetch on 2026-09-17.
   Update here to change site-wide. */

const POETIQ_PRODUCTS = [
  {
    id: "room-spray",
    name: "Room Spray",
    size: "30 ml",
    price: 490,
    tone: "warmgrey",
    desc: "An instant mist for the room, inspired by highland air.",
    photo: "room-spray.jpg",
  },
  {
    id: "car-perfume",
    name: "Car Perfume",
    size: "8 ml",
    price: 289,
    tone: "almond",
    desc: "A clip-on scent for the everyday commute.",
  },
  {
    id: "aroma-candle",
    name: "Aroma Candle",
    size: "100 ml",
    price: 490,
    tone: "moss",
    desc: "A slow-burning soy candle for quiet evenings at home.",
    photo: "aroma-candle.jpg",
  },
  {
    id: "reed-diffuser",
    name: "Reed Diffuser",
    size: "45 ml",
    price: 590,
    tone: "plum",
    desc: "Continuous fragrance through natural reed sticks.",
    photo: "reed-diffuser.jpg",
  },
  {
    id: "aroma-oil",
    name: "Aroma Oil",
    size: "15 ml",
    price: 390,
    tone: "warmgrey",
    desc: "Concentrated oil for your own diffuser or burner.",
    photo: "aroma-oil.jpg",
  },
  {
    id: "aroma-stone-oil",
    name: "Aroma Stone & Oil",
    size: "15 ml",
    price: 590,
    tone: "almond",
    desc: "Scented stones with oil for drawers, closets and small rooms.",
  },
  {
    id: "refill-100",
    name: "Reed Diffuser Refill",
    size: "100 ml",
    price: 590,
    tone: "moss",
    desc: "Top up your reed diffuser without buying a new bottle.",
  },
  {
    id: "refill-500",
    name: "Reed Diffuser Refill",
    size: "500 ml",
    price: 1090,
    tone: "plum",
    desc: "Bulk refill for continuous fragrance across a larger space.",
  },
  {
    id: "refill-1000",
    name: "Reed Diffuser Refill",
    size: "1000 ml",
    price: 1090,
    tone: "warmgrey",
    desc: "Bulk refill for continuous fragrance across a larger space.",
  },
];

const POETIQ_SCENTS = [
  "Wild White Tea",
  "Holiday Brunch",
  "Way to the Hill",
  "Lanna Lantern",
  "Willow in the Valley",
  "First Rain Tea",
  "Morning Ritual",
  "Mist by the Lake",
  "The Poet's Garden",
  "The Rice Season",
  "The Hidden Kingdom",
  "The Weaver's House",
  "The Coachman's Trail",
];

function poetiqFormatBaht(amount) {
  return "฿" + amount.toLocaleString("en-US");
}

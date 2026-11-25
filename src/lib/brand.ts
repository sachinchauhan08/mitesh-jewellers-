export const BRAND = {
  name: "Mitesh Jewellers",
  shortName: "Mitesh",
  tagline: "Gold & silver jewellery",
  city: "Babra",
  state: "Gujarat",
  address: "Mahadev Complex, Main Bazaar Rd, Babra, Gujarat 365421",
  addressLines: ["Mahadev Complex, Main Bazaar Rd", "Babra, Gujarat 365421"],
  phone: "+91 94272 61465",
  phoneHref: "tel:+919427261465",
  whatsapp: "919427261465",
  email: "care@miteshjewellers.in",
  gstin: "24AABCA1234M1Z5",
  hours: [
    { days: "Monday – Saturday", time: "9:00 AM – 8:00 PM" },
    { days: "Sunday", time: "9:00 AM – 1:00 PM" },
  ],
  payments: ["Credit cards", "Debit cards", "NFC mobile payments"],
  profiles: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/explore/search/keyword/?q=Mitesh%20Jewellers",
    },
    {
      label: "IndiaMART",
      href: "https://www.indiamart.com/search.mp?ss=Mitesh+Jewellers",
    },
    {
      label: "Justdial",
      href: "https://www.justdial.com/search?q=Mitesh+Jewellers",
    },
  ],
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Mitesh+Jewellers+Mahadev+Complex+Main+Bazaar+Rd+Babra+Gujarat+365421",
  established: "Babra, Gujarat",
} as const;

export const BRAND_TITLE = `${BRAND.name} — ${BRAND.tagline}`;

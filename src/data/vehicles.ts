export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  bodyType: string;
  image: string;
  images: string[];
  basePrice: number;
  available: boolean;
  specs: {
    engine: string;
    power: string;
    transmission: string;
    fuel: string;
    consumption: string;
    trunk: string;
    seats: number;
  };
  features: string[];
  optionals: string[];
  description: string;
}

export const vehicles: Vehicle[] = [
  {
    id: "1",
    brand: "BMW",
    model: "320i Sport",
    year: 2025,
    bodyType: "Sedan",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
      "https://images.unsplash.com/photo-1520050206757-06da69ec5551?w=800&q=80",
    ],
    basePrice: 4290,
    available: true,
    specs: {
      engine: "2.0 Turbo",
      power: "184 cv",
      transmission: "Automático 8 marchas",
      fuel: "Gasolina",
      consumption: "11.2 km/l",
      trunk: "480 litros",
      seats: 5,
    },
    features: [
      "Ar-condicionado digital",
      'Central multimídia 10"',
      "Faróis LED",
      "Sensor de estacionamento",
      "Câmera de ré",
      "Piloto automático adaptativo",
    ],
    optionals: ["Teto solar panorâmico", "Bancos em couro", "Sistema de som Harman Kardon"],
    description:
      "O BMW 320i Sport combina elegância, performance e tecnologia de ponta. Ideal para quem busca sofisticação no dia a dia.",
  },
  {
    id: "2",
    brand: "Mercedes-Benz",
    model: "A 200 Sedan",
    year: 2025,
    bodyType: "Sedan",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80"],
    basePrice: 3990,
    available: true,
    specs: {
      engine: "1.3 Turbo",
      power: "163 cv",
      transmission: "Automático 7 marchas DCT",
      fuel: "Gasolina",
      consumption: "12.5 km/l",
      trunk: "420 litros",
      seats: 5,
    },
    features: [
      "MBUX com inteligência artificial",
      "Painel digital",
      "Faróis LED",
      "Assistente de frenagem ativa",
      "Ar dual zone",
    ],
    optionals: ["Pacote AMG Line", "Iluminação ambiente 64 cores"],
    description:
      "O Mercedes-Benz A 200 Sedan oferece o melhor da tecnologia MBUX com design arrojado e interior luxuoso.",
  },
  {
    id: "3",
    brand: "Volvo",
    model: "XC40 T5 R-Design",
    year: 2025,
    bodyType: "SUV",
    image: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&q=80"],
    basePrice: 5190,
    available: true,
    specs: {
      engine: "2.0 Turbo",
      power: "252 cv",
      transmission: "Automático 8 marchas",
      fuel: "Gasolina",
      consumption: "9.8 km/l",
      trunk: "460 litros",
      seats: 5,
    },
    features: [
      "Pilot Assist",
      'Painel digital 12"',
      "Sistema de som Harman Kardon",
      "Teto solar panorâmico",
      "Carregador wireless",
    ],
    optionals: ["Pacote de proteção urbana", 'Rodas 20"'],
    description: "O XC40 R-Design combina a segurança escandinava com design esportivo e tecnologia avançada.",
  },
  {
    id: "4",
    brand: "Audi",
    model: "A3 Sedan Performance",
    year: 2025,
    bodyType: "Sedan",
    image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80"],
    basePrice: 3790,
    available: false,
    specs: {
      engine: "2.0 TFSI",
      power: "204 cv",
      transmission: "Automático S tronic 7 marchas",
      fuel: "Gasolina",
      consumption: "11.8 km/l",
      trunk: "425 litros",
      seats: 5,
    },
    features: [
      "Audi Virtual Cockpit",
      "MMI Touch",
      "Faróis Matrix LED",
      "Drive Select",
      "Assistente de estacionamento",
    ],
    optionals: ["Pacote S line", "Bang & Olufsen Premium Sound"],
    description: "O Audi A3 Sedan Performance entrega esportividade refinada com a qualidade de construção Audi.",
  },
  {
    id: "5",
    brand: "Jeep",
    model: "Compass Limited T270",
    year: 2025,
    bodyType: "SUV",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80"],
    basePrice: 3290,
    available: true,
    specs: {
      engine: "1.3 Turbo Flex",
      power: "185 cv",
      transmission: "Automático 6 marchas",
      fuel: "Flex",
      consumption: "10.5 km/l",
      trunk: "410 litros",
      seats: 5,
    },
    features: ['Tela 10.1" Uconnect', "Carregador wireless", "Câmera 360°", "Ar digital dual zone", "Keyless entry"],
    optionals: ["Teto solar", "Pacote High-Tech"],
    description: "O Compass Limited T270 é o SUV completo para quem quer conforto, tecnologia e versatilidade.",
  },
  {
    id: "6",
    brand: "Test Car",
    model: "Test Car",
    year: 2026,
    bodyType: "SUV",
    image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80"],
    basePrice: 1,
    available: true,
    specs: {
      engine: "1.8 Hybrid",
      power: "122 cv",
      transmission: "CVT (e-CVT)",
      fuel: "Flex Híbrido",
      consumption: "16.2 km/l",
      trunk: "440 litros",
      seats: 5,
    },
    features: ["Toyota Safety Sense", 'Painel digital 12.3"', "JBL Premium Audio", "Teto solar", "Head-up display"],
    optionals: ["Bancos em couro premium", "Frigobar"],
    description:
      "Economia e sustentabilidade com a tecnologia híbrida Toyota. O Corolla Cross XRX entrega o melhor dos dois mundos.",
  },
];

export const brands = [...new Set(vehicles.map((v) => v.brand))];
export const bodyTypes = [...new Set(vehicles.map((v) => v.bodyType))];

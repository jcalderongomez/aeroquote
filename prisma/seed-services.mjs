import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const organizationSlug = process.env.ORGANIZATION_SLUG?.trim() || "aeroquote-demo";

const catalog = [
  ["Fotografía aérea", "Fotografía aérea", "Captura de imágenes aéreas para proyectos y comunicación.", "photo"],
  ["Video promocional", "Video y audiovisual", "Producción de video aéreo para promoción comercial.", "video"],
  ["Inspección de fachadas", "Inspección técnica", "Inspección visual aérea de fachadas y estructuras verticales.", "project"],
  ["Inspección de cubiertas", "Inspección técnica", "Revisión visual aérea de cubiertas y tejados.", "project"],
  ["Inspección de infraestructura", "Inspección técnica", "Inspección visual de infraestructura y activos.", "project"],
  ["Seguimiento de obras", "Seguimiento de obras", "Registro aéreo periódico del avance de obra.", "visit"],
  ["Fotografía inmobiliaria", "Fotografía y video", "Fotografía aérea para inmuebles y proyectos inmobiliarios.", "property"],
  ["Fotogrametría", "Topografía y fotogrametría", "Captura de datos para reconstrucción fotogramétrica.", "hectare"],
  ["Modelos 3D", "Topografía y fotogrametría", "Generación de modelos tridimensionales a partir de captura aérea.", "project"],
  ["Ortofotografía", "Topografía y fotogrametría", "Generación de ortofotografías georreferenciadas.", "hectare"],
  ["Levantamientos topográficos", "Topografía y fotogrametría", "Captura aérea de información para levantamientos topográficos.", "hectare"],
  ["Modelos digitales de elevación", "Topografía y fotogrametría", "Generación de modelos digitales de terreno y elevación.", "hectare"],
  ["Agricultura de precisión", "Agricultura", "Captura y análisis aéreo para monitoreo de cultivos.", "hectare"],
  ["Inspección de paneles solares", "Inspección técnica", "Inspección aérea de instalaciones y paneles solares.", "project"],
  ["Inspección de antenas y torres", "Inspección técnica", "Inspección visual aérea de antenas, torres y estructuras.", "structure"],
  ["Cobertura aérea de eventos", "Eventos y turismo", "Registro aéreo de eventos y actividades.", "hour"],
  ["Fotografía aérea para turismo", "Eventos y turismo", "Captura de imágenes aéreas para destinos y experiencias turísticas.", "photo"],
  ["Registro audiovisual comercial", "Video y audiovisual", "Captura de fotografía y video aéreo para uso comercial.", "project"],
];

try {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true },
  });

  if (!organization) {
    throw new Error(`No existe la organización "${organizationSlug}". Configura ORGANIZATION_SLUG o crea la organización primero.`);
  }

  const result = await prisma.service.createMany({
    data: catalog.map(([name, category, description, unit]) => ({
      organizationId: organization.id,
      name,
      category,
      description,
      unit,
      basePrice: "0.00",
      quoteMode: "EVALUATION",
      isPublic: false,
      active: true,
    })),
    skipDuplicates: true,
  });

  console.log(`Organización: ${organization.name}`);
  console.log(`Servicios nuevos: ${result.count}`);
  console.log(`Servicios ya existentes y conservados: ${catalog.length - result.count}`);
  console.log("Las tarifas quedaron en COP 0 para configurarlas antes de elaborar cotizaciones.");
} finally {
  await prisma.$disconnect();
}

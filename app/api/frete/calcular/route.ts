import { NextRequest, NextResponse } from "next/server";

type CalculateFreightBody = {
  origin: {
    zip_code?: string;
    address_line?: string;
    address_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  destination: {
    zip_code?: string;
    address_line?: string;
    address_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  pricing: {
    price_per_km?: number;
    minimum_fee?: number;
    round_trip_multiplier?: number;
    max_distance_km?: number; // 👈 NOVO
  };
};

type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

function buildAddress(input: {
  zip_code?: string;
  address_line?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}) {
  return [
    input.address_line,
    input.address_number,
    input.neighborhood,
    input.city,
    input.state,
    input.zip_code,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

async function geocodeAddress(address: string, apiKey: string) {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");
  url.searchParams.set("boundary.country", "BR");

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error("Erro no geocode");

  const data = await response.json();
  const feature = data?.features?.[0];

  if (!feature?.geometry?.coordinates) return null;

  const [lng, lat] = feature.geometry.coordinates;

  return { lat, lng, label: address };
}

async function getDistance(origin: any, destination: any, apiKey: string) {
  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
      }),
    }
  );

  if (!response.ok) throw new Error("Erro na rota");

  const data = await response.json();
  const summary = data?.routes?.[0]?.summary;

  return {
    distanceKm: summary.distance / 1000,
    durationMinutes: summary.duration / 60,
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ORS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ORS_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as CalculateFreightBody;

    const originAddress = buildAddress(body.origin);
    const destinationAddress = buildAddress(body.destination);

    const pricePerKm = Number(body.pricing?.price_per_km || 0);
    const minimumFee = Number(body.pricing?.minimum_fee || 0);
    const multiplier = Number(body.pricing?.round_trip_multiplier || 1);
    const maxDistance = Number(body.pricing?.max_distance_km || 10); // 👈 AQUI

    const [originGeo, destinationGeo] = await Promise.all([
      geocodeAddress(originAddress, apiKey),
      geocodeAddress(destinationAddress, apiKey),
    ]);

    if (!originGeo || !destinationGeo) {
      return NextResponse.json(
        { error: "Endereço inválido." },
        { status: 400 }
      );
    }

    const route = await getDistance(originGeo, destinationGeo, apiKey);

    // 🚨 BLOQUEIO DE DISTÂNCIA
    if (route.distanceKm > maxDistance) {
      return NextResponse.json(
        {
          error: "DISTANCE_EXCEEDED",
          message: `Infelizmente não entregamos nesse endereço no momento. Nosso limite de entrega é de ${maxDistance} km e esse destino está a ${Number(
            route.distanceKm.toFixed(2)
          )} km da nossa base. Se preferir, você pode retirar conosco no endereço: ${originAddress}.`,
          distance_km: Number(route.distanceKm.toFixed(2)),
          max_distance_km: maxDistance,
          pickup_address: originAddress,
          allow_pickup: true,
        },
        { status: 400 }
      );
    }

    const rawFreight = route.distanceKm * pricePerKm * multiplier;
    const finalFreight = Math.max(rawFreight, minimumFee);

    return NextResponse.json({
      success: true,
      distance_km: Number(route.distanceKm.toFixed(2)),
      duration_minutes: Number(route.durationMinutes.toFixed(0)),
      final_freight: Number(finalFreight.toFixed(2)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao calcular frete." },
      { status: 500 }
    );
  }
}
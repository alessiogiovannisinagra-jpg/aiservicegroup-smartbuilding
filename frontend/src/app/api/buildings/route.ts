import { NextResponse } from "next/server";

const API = "http://127.0.0.1:8000/api/buildings";

export async function GET() {
  try {
    const response = await fetch(API, { cache: "no-store" });
    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Backend non disponibile" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Impossibile raggiungere il backend" },
      { status: 503 }
    );
  }
}

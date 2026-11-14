import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

type Context = {
  params: Promise<{ id: string; resource: string[] }>;
};

async function proxy(request: NextRequest, context: Context) {
  try {
    const { id, resource } = await context.params;
    const path = resource.map(encodeURIComponent).join("/");
    const url = `${BACKEND}/api/buildings/${encodeURIComponent(id)}/${path}`;

    const options: RequestInit = {
      method: request.method,
      headers: { "Content-Type": "application/json" },
    };

    if (request.method !== "GET" && request.method !== "DELETE") {
      options.body = await request.text();
    }

    const response = await fetch(url, options);
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "Errore di comunicazione con il backend" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;

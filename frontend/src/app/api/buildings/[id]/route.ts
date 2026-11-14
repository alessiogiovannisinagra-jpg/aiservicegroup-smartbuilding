import { NextResponse } from "next/server";

const API = "http://127.0.0.1:8000/api/buildings";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${API}/${id}`, {
      method: "GET",
      cache: "no-store",
    });

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

export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
    });

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

export async function DELETE(_: Request, context: Context) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${API}/${id}`, {
      method: "DELETE",
    });

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

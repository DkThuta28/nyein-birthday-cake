import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MenuItem, { IMenuPhoto } from "@/models/MenuItem";

function sanitizePhotoList(input: unknown): IMenuPhoto[] {
  if (!Array.isArray(input)) return [];

  const list: IMenuPhoto[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id === "string" && typeof item.img === "string") {
      list.push({
        id: item.id,
        img: item.img,
        darkBg: Boolean(item.darkBg),
      });
    }
  }
  return list;
}

export async function GET() {
  try {
    await connectToDatabase();
    const doc = await MenuItem.findOne({ key: "main-menu" }).lean();

    if (!doc) {
      return NextResponse.json(
        { collections: null, popularPicks: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        collections: Array.isArray(doc.collections) ? doc.collections : [],
        popularPicks: Array.isArray(doc.popularPicks) ? doc.popularPicks : [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch menu",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const collections = sanitizePhotoList(body?.collections);
    const popularPicks = sanitizePhotoList(body?.popularPicks);

    const updatedMenu = await MenuItem.findOneAndUpdate(
      { key: "main-menu" },
      {
        $set: {
          key: "main-menu",
          collections,
          popularPicks,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(
      {
        message: "Menu saved to database successfully",
        collections: updatedMenu?.collections ?? collections,
        popularPicks: updatedMenu?.popularPicks ?? popularPicks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/menu error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save menu to database",
      },
      { status: 500 }
    );
  }
}
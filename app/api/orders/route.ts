import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

function parseDayMonthYear(
  raw: string
): { formatted: string; dateKey: string } | null {
  const match = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  const checkDate = new Date(year, month - 1, day);
  if (
    checkDate.getFullYear() !== year ||
    checkDate.getMonth() !== month - 1 ||
    checkDate.getDate() !== day
  ) {
    return null;
  }

  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");

  return {
    formatted: `${dd}.${mm}.${year}`,
    dateKey: `${year}-${mm}-${dd}`,
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const cakeRecipientName = String(body.cakeRecipientName || "").trim();
    const customerName = String(body.customerName || "").trim();
    const priceMmk = Number(body.priceMmk) || 0;
    const rawDeliDate = String(body.deliDate || "").trim();
    const ph = String(body.ph || "").replace(/[^\d]/g, "");

    if (!cakeRecipientName || !customerName) {
      return NextResponse.json(
        {
          error:
            "ကိတ်ပေါ်ရေးမည့်နာမည် နှင့် Customer Name ကို ထည့်သွင်းပေးပါ",
        },
        { status: 400 }
      );
    }

    let deliDate = "";
    let deliDateKey = "";

    if (rawDeliDate) {
      const parsed = parseDayMonthYear(rawDeliDate);
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              "Deli Date ကို DD.MM.YYYY (01-31.01-12.YYYY) ပုံစံဖြင့် မှန်ကန်စွာ ဖြည့်ပါ (ဥပမာ 23.11.2026)",
          },
          { status: 400 }
        );
      }
      deliDate = parsed.formatted;
      deliDateKey = parsed.dateKey;
    }

    const createdOrder = await Order.create({
      cakeRecipientName,
      priceMmk,
      descriptionOnCake: String(body.descriptionOnCake || "").trim(),
      cakeColor: String(body.cakeColor || "").trim(),
      customerName,
      deliDate,
      deliDateKey,
      ph,
      photoUrl: String(body.photoUrl || ""),
      photoName: String(body.photoName || ""),
    });

    return NextResponse.json(
      {
        message: "Order saved to database successfully",
        order: createdOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save order to database",
      },
      { status: 500 }
    );
  }
}
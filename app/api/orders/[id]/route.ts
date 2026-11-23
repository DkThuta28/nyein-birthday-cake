import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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

async function handleUpdateOrder(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid order ID format." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const body = await req.json();

    const cakeRecipientName = String(body.cakeRecipientName || "").trim();
    const customerName = String(body.customerName || "").trim();
    const priceMmk = Number(body.priceMmk) || 0;
    const rawDeliDate = String(body.deliDate || "").trim();

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

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          cakeRecipientName,
          priceMmk,
          descriptionOnCake: String(body.descriptionOnCake || "").trim(),
          cakeColor: String(body.cakeColor || "").trim(),
          customerName,
          deliDate,
          deliDateKey,
          photoUrl: String(body.photoUrl || ""),
          photoName: String(body.photoName || ""),
          ph: String(body.ph || "").replace(/[^\d]/g, ""),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order not found in database." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Order updated in database successfully",
        order: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update order in database",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateOrder(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateOrder(req, context);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid order ID format." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return NextResponse.json(
        { error: "Order not found in database." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Order deleted from database successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete order from database",
      },
      { status: 500 }
    );
  }
}
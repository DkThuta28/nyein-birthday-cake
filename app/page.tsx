"use client";

import {
  ChangeEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { compressImageFile } from "../lib/compressImage";

interface OrderRecord {
  _id: string;
  cakeRecipientName: string;
  priceMmk: number;
  descriptionOnCake: string;
  cakeColor: string;
  customerName: string;
  deliDate: string;
  deliDateKey: string;
  ph?: string;
  photoUrl: string;
  photoName: string;
  createdAt?: string;
}

interface CakeMenuPhotoItem {
  id: string;
  img: string;
  darkBg: boolean;
}

const DEFAULT_COLLECTIONS: CakeMenuPhotoItem[] = [
  { id: "col-1", img: "/today-cake.jpg", darkBg: false },
  { id: "col-2", img: "/photocake.png", darkBg: true },
  { id: "col-3", img: "/today-cake.jpg", darkBg: false },
];

const DEFAULT_POPULAR_PICKS: CakeMenuPhotoItem[] = [
  { id: "pick-1", img: "/today-cake.jpg", darkBg: false },
  { id: "pick-2", img: "/photocake.png", darkBg: true },
  { id: "pick-3", img: "/today-cake.jpg", darkBg: false },
  { id: "pick-4", img: "/photocake.png", darkBg: true },
  { id: "pick-5", img: "/today-cake.jpg", darkBg: false },
  { id: "pick-6", img: "/photocake.png", darkBg: true },
];

const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function reorderItems<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function CakeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Candle & Flame */}
      <path d="M12 2c.7.9.7 1.7 0 2.5" />
      <path d="M12 5v2" />
      {/* Top Tier */}
      <path d="M7 10a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1H7v-1Z" />
      {/* Bottom Tier with Wavy Icing */}
      <path d="M4 13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" />
      <path d="M4 14c1.2 1 2.4 1 3.6 0s2.4-1 3.6 0 2.4 1 3.6 0 2.4-1 3.6 0 1.6.5 1.6.5" />
      {/* Cake Plate */}
      <path d="M2 20h20" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function formatDdMmYyyyAutoDot(nextRaw: string, prevRaw: string): string {
  // Allow smooth deletion / backspace
  if (nextRaw.length < prevRaw.length) {
    return nextRaw;
  }

  const rawParts = nextRaw.split(".");
  if (rawParts.length > 3) return prevRaw;

  // 1) Day: digits only, max 2 chars, max 31
  let dayPart = (rawParts[0] || "").replace(/[^\d]/g, "").slice(0, 2);
  if (dayPart.length === 2 && Number(dayPart) > 31) {
    dayPart = dayPart.slice(0, 1);
  }

  const hasFirstDotInInput = rawParts.length >= 2;
  const autoFirstDot = dayPart.length === 2;

  // 2) Month: digits only, max 2 chars, max 12
  let monthPart = (rawParts[1] || "").replace(/[^\d]/g, "").slice(0, 2);
  if (monthPart.length === 2 && Number(monthPart) > 12) {
    monthPart = monthPart.slice(0, 1);
  }

  const hasSecondDotInInput = rawParts.length >= 3;
  const autoSecondDot = autoFirstDot && monthPart.length === 2;

  // 3) Year: digits only, max 4 chars
  const yearPart = (rawParts[2] || "").replace(/[^\d]/g, "").slice(0, 4);

  if (!hasFirstDotInInput && !autoFirstDot) {
    return dayPart;
  }

  if (!hasSecondDotInInput && !autoSecondDot) {
    return `${dayPart}.${monthPart}`;
  }

  return `${dayPart}.${monthPart}.${yearPart}`;
}

function parseDdMmYyyyKey(raw: string): string {
  const match = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";

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
    return "";
  }

  const checkDate = new Date(year, month - 1, day);
  if (
    checkDate.getFullYear() !== year ||
    checkDate.getMonth() !== month - 1 ||
    checkDate.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function FallbackCakeArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${compact ? "scale-90" : ""
        }`}
    >
      {/* Top Berries */}
      <div className="z-10 -mb-2 flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full bg-[#2b1d42] shadow-xs" />
        <span className="h-4 w-4 rounded-full bg-[#d91e4a] shadow-xs" />
        <span className="h-4 w-4 rounded-full bg-[#e62e5b] shadow-xs" />
        <span className="h-3.5 w-3.5 rounded-full bg-[#2b1d42] shadow-xs" />
      </div>

      {/* Top Tier Cake */}
      <div className="relative flex h-20 w-36 items-center justify-center rounded-2xl bg-gradient-to-b from-[#d82b62] via-[#b91c50] to-[#981440] shadow-lg border border-pink-200/25">
        <span className="h-2.5 w-4 rotate-12 rounded-xs bg-amber-300/90 mr-4" />
        <span className="h-2 w-3 -rotate-12 rounded-xs bg-amber-200/90 mt-3" />
      </div>

      {/* Mid Berries */}
      <div className="z-10 -my-1.5 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#d91e4a]" />
        <span className="h-3.5 w-3.5 rounded-full bg-[#2b1d42]" />
        <span className="h-3.5 w-3.5 rounded-full bg-[#e62e5b]" />
        <span className="h-3.5 w-3.5 rounded-full bg-[#2b1d42]" />
      </div>

      {/* Bottom Tier Cake */}
      <div className="relative flex h-24 w-48 items-center justify-center rounded-2xl bg-gradient-to-b from-[#cf255c] via-[#ad1849] to-[#8a1038] shadow-xl border border-pink-200/25">
        <span className="h-2.5 w-4 -rotate-6 rounded-xs bg-amber-300/90 ml-6" />
        <span className="h-2 w-3 rotate-12 rounded-xs bg-amber-200/90 mb-4" />
      </div>

      {/* Cake Plate & Stand */}
      <div className="-mt-1 h-3.5 w-56 rounded-full bg-gradient-to-b from-white to-zinc-200 shadow-md" />
      <div className="h-10 w-10 bg-gradient-to-r from-zinc-200 via-white to-zinc-300 [clip-path:polygon(20%_0%,80%_0%,100%_100%,0%_100%)]" />
      <div className="h-2.5 w-28 rounded-full bg-gradient-to-b from-white to-zinc-300 shadow-sm" />
    </div>
  );
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function NyeinLandingPage() {
  const [heroImgError, setHeroImgError] = useState(false);
  const [bgCakeError, setBgCakeError] = useState(false);
  const [isEnteringCircle, setIsEnteringCircle] = useState(false);
  const [isInsideCircle, setIsInsideCircle] = useState(false);
  const [activeAction, setActiveAction] = useState<
    "customer-order" | "order-history" | null
  >(null);

  // Menu Edit, DB Persistence & Touch/Pointer Drag Reorder state inside Circle View
  const [isMenuEditing, setIsMenuEditing] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuSaveNotice, setMenuSaveNotice] = useState<string | null>(null);
  const menuUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [menuUploadTarget, setMenuUploadTarget] = useState<
    "collections" | "picks"
  >("collections");
  const [collections, setCollections] =
    useState<CakeMenuPhotoItem[]>(DEFAULT_COLLECTIONS);
  const [popularPicks, setPopularPicks] = useState<CakeMenuPhotoItem[]>(
    DEFAULT_POPULAR_PICKS
  );

  const [previewCake, setPreviewCake] = useState<{
    img: string;
    title?: string;
    list?: "collections" | "picks";
    index?: number;
  } | null>(null);

  const [draggingMenu, setDraggingMenu] = useState<{
    section: "collections" | "picks";
    fromIndex: number;
    overIndex: number;
  } | null>(null);
  const draggingMenuRef = useRef<{
    section: "collections" | "picks";
    fromIndex: number;
    overIndex: number;
  } | null>(null);
  const collectionCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pickCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Toggle between Calendar view and All Orders grouped by Deli Date list view
  const [historyViewMode, setHistoryViewMode] = useState<"calendar" | "list">(
    "calendar"
  );

  // Selected order for read-only / editable Detail view
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<OrderRecord | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [editPhotoName, setEditPhotoName] = useState("");
  const [editRecipientName, setEditRecipientName] = useState("");
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCakeColor, setEditCakeColor] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editDeliDate, setEditDeliDate] = useState("");
  const [editPh, setEditPh] = useState("");
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [editStatusMessage, setEditStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement | null>(null);

  // Staggered animation state for Customer Order boxes
  const [orderBoxesVisible, setOrderBoxesVisible] = useState(false);

  // Customer Order states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>("");
  const [cakeRecipientName, setCakeRecipientName] = useState("");
  const [cakePriceInput, setCakePriceInput] = useState("");
  const [descriptionOnCake, setDescriptionOnCake] = useState("");
  const [cakeColor, setCakeColor] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliDate, setDeliDate] = useState("");
  const [ph, setPh] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Orders list from MongoDB for Order History
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const persistMenuToDb = useCallback(
    async (
      nextCollections: CakeMenuPhotoItem[],
      nextPicks: CakeMenuPhotoItem[]
    ) => {
      setIsSavingMenu(true);
      setMenuSaveNotice(null);
      try {
        const res = await fetch("/api/menu", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collections: nextCollections,
            popularPicks: nextPicks,
          }),
        });
        if (!res.ok) {
          setMenuSaveNotice("Database ထဲ သိမ်းမရပါ");
        } else {
          setMenuSaveNotice("Saved to DB");
        }
      } catch {
        setMenuSaveNotice("Server ချိတ်မရပါ");
      } finally {
        setIsSavingMenu(false);
      }
    },
    []
  );

  const fetchMenuFromDb = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.collections)) {
        setCollections(data.collections);
      }
      if (Array.isArray(data.popularPicks)) {
        setPopularPicks(data.popularPicks);
      }
    } catch {
      // keep current state on transient network issue
    } finally {
      setShowSplash(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuFromDb();
  }, [fetchMenuFromDb]);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch {
      // ignore transient error when fetching
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  const handleDeleteOrder = async (
    e: MouseEvent<HTMLButtonElement>,
    orderId: string
  ) => {
    e.stopPropagation();
    if (deletingOrderId) return;

    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((item) => item._id !== orderId));
        if (selectedOrderDetail?._id === orderId) {
          setSelectedOrderDetail(null);
          setIsEditingOrder(false);
        }
      }
    } catch {
      // ignore transient error when deleting
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Client-only current date initialization to avoid Next.js unstable Date error
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setTodayDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const todayKey = useMemo(
    () => (todayDate ? toDateKey(todayDate) : ""),
    [todayDate]
  );

  const calendarDays = useMemo(() => {
    if (!todayDate) return [];

    const list: {
      key: string;
      dayNumber: number;
      weekdayShort: string;
      monthShort: string;
      isToday: boolean;
      isMonthStart: boolean;
    }[] = [];

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // 6 past days + Today (1 day) = 7 days total, then +30 future days
    for (let offset = -6; offset <= 30; offset++) {
      const d = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        todayDate.getDate() + offset
      );
      list.push({
        key: toDateKey(d),
        dayNumber: d.getDate(),
        weekdayShort: weekdayNames[d.getDay()],
        monthShort: MONTH_SHORT_NAMES[d.getMonth()],
        isToday: offset === 0,
        isMonthStart: d.getDate() === 1,
      });
    }
    return list;
  }, [todayDate]);

  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Map of deliDateKey -> count of orders
  const orderCountByDateKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ord of orders) {
      const key =
        ord.deliDateKey || (ord.deliDate ? parseDdMmYyyyKey(ord.deliDate) : "");
      if (key) {
        map[key] = (map[key] || 0) + 1;
      }
    }
    return map;
  }, [orders]);

  const ordersForSelectedDate = useMemo(() => {
    return orders.filter((ord) => {
      const key =
        ord.deliDateKey || (ord.deliDate ? parseDdMmYyyyKey(ord.deliDate) : "");
      return key === selectedDateKey;
    });
  }, [orders, selectedDateKey]);

  // All orders grouped by Deli Date for "List ဖြင့်ကြည့်ရန်"
  const groupedOrdersByDeliDate = useMemo(() => {
    const groups: {
      sortKey: string;
      heading: string;
      items: OrderRecord[];
    }[] = [];
    const map = new Map<
      string,
      { sortKey: string; heading: string; items: OrderRecord[] }
    >();

    for (const ord of orders) {
      const normalizedKey =
        ord.deliDateKey || (ord.deliDate ? parseDdMmYyyyKey(ord.deliDate) : "");
      const heading = ord.deliDate?.trim() || "Deli Date မပါဝင်သော Order များ";
      const groupId = normalizedKey || heading;
      const sortKey = normalizedKey || "9999-99-99";

      if (!map.has(groupId)) {
        map.set(groupId, { sortKey, heading, items: [] });
      }
      map.get(groupId)!.items.push(ord);
    }

    groups.push(...map.values());
    groups.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return groups;
  }, [orders]);

  const scrollToStartOfDateKey = (
    key: string,
    behavior: ScrollBehavior = "smooth"
  ) => {
    const container = calendarScrollRef.current;
    const btn = dayButtonRefs.current[key];
    if (!container || !btn) return;

    const targetEl = btn.parentElement || btn;
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const currentScrollLeft = container.scrollLeft;
    const exactLeft = currentScrollLeft + (targetRect.left - containerRect.left);

    container.scrollTo({
      left: Math.max(0, Math.round(exactLeft)),
      behavior,
    });
  };

  useEffect(() => {
    if (activeAction === "order-history" && todayKey) {
      setSelectedDateKey(todayKey);
      setSelectedOrderDetail(null);
      setIsEditingOrder(false);
      setEditStatusMessage(null);
      setHistoryViewMode("calendar");
      fetchOrders();
      const timer = setTimeout(() => {
        scrollToStartOfDateKey(todayKey, "auto");
      }, 40);
      return () => clearTimeout(timer);
    } else {
      setSelectedOrderDetail(null);
      setIsEditingOrder(false);
      setEditStatusMessage(null);
    }
  }, [activeAction, todayKey, fetchOrders]);

  const startEditingOrder = (ord: OrderRecord) => {
    setEditPhotoUrl(ord.photoUrl || null);
    setEditPhotoName(ord.photoName || "");
    setEditRecipientName(ord.cakeRecipientName || "");
    setEditPriceInput(ord.priceMmk ? String(Number(ord.priceMmk)) : "");
    setEditDescription(ord.descriptionOnCake || "");
    setEditCakeColor(ord.cakeColor || "");
    setEditCustomerName(ord.customerName || "");
    setEditDeliDate(ord.deliDate || "");
    setEditPh((ord.ph || "").replace(/[^\d]/g, ""));
    setEditStatusMessage(null);
    setIsEditingOrder(true);
    setTimeout(() => {
      const el = editDescriptionRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }, 20);
  };

  const handleEditPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEditPhoto = () => {
    setEditPhotoUrl(null);
    setEditPhotoName("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrderDetail || isUpdatingOrder) return;

    if (!editRecipientName.trim() || !editCustomerName.trim()) {
      setEditStatusMessage({
        type: "error",
        text: "ကိတ်ပေါ်ရေးမည့်နာမည် နှင့် Customer Name ကို ဖြည့်ပေးပါ။",
      });
      return;
    }

    const normalizedDeliKey = editDeliDate.trim()
      ? parseDdMmYyyyKey(editDeliDate)
      : "";
    if (editDeliDate.trim() && !normalizedDeliKey) {
      setEditStatusMessage({
        type: "error",
        text: "Deli Date ကို DD.MM.YYYY (01-31.01-12.YYYY) ပုံစံဖြင့် မှန်ကန်စွာ ဖြည့်ပါ (ဥပမာ 23.11.2026)။",
      });
      return;
    }

    setIsUpdatingOrder(true);
    setEditStatusMessage(null);

    const updatedNumericPrice = editPriceInput ? Number(editPriceInput) : 0;
    const cleanedEditPh = editPh.replace(/[^\d]/g, "");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(selectedOrderDetail._id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cakeRecipientName: editRecipientName.trim(),
            priceMmk: updatedNumericPrice,
            descriptionOnCake: editDescription.trim(),
            cakeColor: editCakeColor.trim(),
            customerName: editCustomerName.trim(),
            deliDate: editDeliDate.trim(),
            deliDateKey: normalizedDeliKey,
            ph: cleanedEditPh,
            photoUrl: editPhotoUrl || "",
            photoName: editPhotoName || "",
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEditStatusMessage({
          type: "error",
          text:
            data.error ||
            "Order ကို Update လုပ်ရာတွင် အမှားအယွင်း ရှိနေပါသည်။",
        });
        return;
      }

      const updatedRecord: OrderRecord = {
        ...selectedOrderDetail,
        cakeRecipientName: editRecipientName.trim(),
        priceMmk: updatedNumericPrice,
        descriptionOnCake: editDescription.trim(),
        cakeColor: editCakeColor.trim(),
        customerName: editCustomerName.trim(),
        deliDate: editDeliDate.trim(),
        deliDateKey: normalizedDeliKey,
        ph: cleanedEditPh,
        photoUrl: editPhotoUrl || "",
        photoName: editPhotoName || "",
      };

      setSelectedOrderDetail(updatedRecord);
      setIsEditingOrder(false);
      setEditStatusMessage({
        type: "success",
        text: "Order data ကို Update ပြုပြင်ပြီးပါပြီ။",
      });
      fetchOrders();
    } catch {
      setEditStatusMessage({
        type: "error",
        text: "Server သို့ ချိတ်ဆက်၍ မရပါ။ API route (/api/orders/[id]) ကို စစ်ဆေးပါ။",
      });
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleTodayClick = () => {
    if (!todayKey) return;
    setSelectedDateKey(todayKey);
    scrollToStartOfDateKey(todayKey, "smooth");
  };

  const resizeDescriptionTextarea = () => {
    const el = descriptionTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (activeAction === "customer-order") {
      setOrderBoxesVisible(false);
      const timer = setTimeout(() => {
        setOrderBoxesVisible(true);
        resizeDescriptionTextarea();
      }, 45);
      return () => clearTimeout(timer);
    } else {
      setOrderBoxesVisible(false);
    }
  }, [activeAction]);

  useEffect(() => {
    resizeDescriptionTextarea();
  }, [descriptionOnCake]);


  function compressImageFileToDataUrl(
    file: File,
    maxDimension = 800,
    quality = 0.72
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.onload = () => {
        const rawDataUrl = reader.result;
        if (typeof rawDataUrl !== "string") {
          reject(new Error("Invalid image data"));
          return;
        }

        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // Add newly uploaded cake photo at the very front (index 0) and save to MongoDB
  const handleMenuPhotoAdd = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const compressedUrl = await compressImageFileToDataUrl(file, 800, 0.72);
      if (menuUploadTarget === "collections") {
        const nextCollections: CakeMenuPhotoItem[] = [
          {
            id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            img: compressedUrl,
            darkBg: collections.length % 2 === 1,
          },
          ...collections,
        ];
        setCollections(nextCollections);
        void persistMenuToDb(nextCollections, popularPicks);
      } else {
        const nextPicks: CakeMenuPhotoItem[] = [
          {
            id: `pick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            img: compressedUrl,
            darkBg: popularPicks.length % 2 === 1,
          },
          ...popularPicks,
        ];
        setPopularPicks(nextPicks);
        void persistMenuToDb(collections, nextPicks);
      }
    } catch {
      setMenuSaveNotice("ပုံဖတ်မရပါ");
    }
  };

  const handleDeleteMenuPhoto = (
    section: "collections" | "picks",
    itemId: string
  ) => {
    if (section === "collections") {
      const nextCollections = collections.filter((item) => item.id !== itemId);
      setCollections(nextCollections);
      void persistMenuToDb(nextCollections, popularPicks);
    } else {
      const nextPicks = popularPicks.filter((item) => item.id !== itemId);
      setPopularPicks(nextPicks);
      void persistMenuToDb(collections, nextPicks);
    }
  };

  // Press-and-drag reordering across items in the same section/column + save order to DB
  const handleMenuItemPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    section: "collections" | "picks",
    index: number
  ) => {
    if (!isMenuEditing) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const initial = { section, fromIndex: index, overIndex: index };
    draggingMenuRef.current = initial;
    setDraggingMenu(initial);
  };

  const handleMenuItemPointerMove = (
    e: ReactPointerEvent<HTMLDivElement>,
    section: "collections" | "picks"
  ) => {
    const current = draggingMenuRef.current;
    if (!current || current.section !== section) return;

    const refs =
      section === "collections"
        ? collectionCardRefs.current
        : pickCardRefs.current;

    let hitIndex = current.overIndex;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== current.overIndex) {
      const updated = { ...current, overIndex: hitIndex };
      draggingMenuRef.current = updated;
      setDraggingMenu(updated);
    }
  };

  const finishMenuItemDrag = () => {
    const current = draggingMenuRef.current;
    if (current) {
      if (current.fromIndex !== current.overIndex) {
        if (current.section === "collections") {
          setCollections((prev) => {
            const nextList = reorderItems(
              prev,
              current.fromIndex,
              current.overIndex
            );
            persistMenuToDb(nextList, popularPicks);
            return nextList;
          });
        } else {
          setPopularPicks((prev) => {
            const nextList = reorderItems(
              prev,
              current.fromIndex,
              current.overIndex
            );
            persistMenuToDb(collections, nextList);
            return nextList;
          });
        }
      }
      draggingMenuRef.current = null;
      setDraggingMenu(null);
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedPhotoName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    setUploadedPhotoName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^\d]/g, "");
    setCakePriceInput(digitsOnly);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescriptionOnCake(e.target.value);
    resizeDescriptionTextarea();
  };

  const handleDeliDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDdMmYyyyAutoDot(e.target.value, deliDate);
    setDeliDate(formatted);
  };

  const handlePhChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^\d]/g, "");
    setPh(digitsOnly);
  };

  const handleEnterCircle = () => {
    if (isEnteringCircle || isInsideCircle) return;
    fetchMenuFromDb();
    setIsEnteringCircle(true);
    setTimeout(() => {
      setIsInsideCircle(true);
      setIsEnteringCircle(false);
    }, 450);
  };

  const handleExitCircle = () => {
    setIsInsideCircle(false);
    setIsEnteringCircle(false);
    setIsMenuEditing(false);
    setMenuSaveNotice(null);
    draggingMenuRef.current = null;
    setDraggingMenu(null);
  };

  const numericPrice = cakePriceInput ? Number(cakePriceInput) : 0;

  const formatMmk = (amount: number) =>
    `${amount.toLocaleString("en-US")} MMK`;

  const handleSaveOrder = async () => {
    if (isSavingOrder) return;

    if (!cakeRecipientName.trim() || !customerName.trim()) {
      setStatusMessage({
        type: "error",
        text: "ကိတ်ပေါ်ရေးမည့်နာမည် နှင့် Customer Name ကို ဖြည့်ပေးပါ။",
      });
      return;
    }

    const normalizedDeliKey = deliDate.trim()
      ? parseDdMmYyyyKey(deliDate)
      : "";
    if (deliDate.trim() && !normalizedDeliKey) {
      setStatusMessage({
        type: "error",
        text: "Deli Date ကို DD.MM.YYYY (01-31.01-12.YYYY) ပုံစံဖြင့် မှန်ကန်စွာ ဖြည့်ပါ (ဥပမာ 23.11.2026)။",
      });
      return;
    }

    setIsSavingOrder(true);
    setStatusMessage(null);

    const cleanedPh = ph.replace(/[^\d]/g, "");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cakeRecipientName: cakeRecipientName.trim(),
          priceMmk: numericPrice,
          descriptionOnCake: descriptionOnCake.trim(),
          cakeColor: cakeColor.trim(),
          customerName: customerName.trim(),
          deliDate: deliDate.trim(),
          deliDateKey: normalizedDeliKey,
          ph: cleanedPh,
          photoUrl: uploadedPhotoUrl || "",
          photoName: uploadedPhotoName || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusMessage({
          type: "error",
          text:
            data.error ||
            "Database ထဲ သိမ်းဆည်းရာတွင် အမှားအယွင်း ရှိနေပါသည်။",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Order saved to database (${customerName.trim()} • ${formatMmk(
          numericPrice
        )})!`,
      });

      // Reset form fields after saving
      setCakeRecipientName("");
      setCakePriceInput("");
      setDescriptionOnCake("");
      setCakeColor("");
      setCustomerName("");
      setDeliDate("");
      setPh("");
      handleRemovePhoto();
      fetchOrders();
    } catch {
      setStatusMessage({
        type: "error",
        text: "Server သို့ ချိတ်ဆက်၍ မရပါ။ MONGODB_URI နှင့် API ကို စစ်ဆေးပါ။",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const boxAnim = () =>
    `transition-all duration-500 ease-out ${orderBoxesVisible
      ? "opacity-100 translate-y-0 scale-100"
      : "opacity-0 translate-y-5 scale-[0.97]"
    }`;

  return (
    <div className="min-h-screen bg-[#1c0c14] flex items-center justify-center p-0 sm:p-4">
      <main className="relative flex min-h-screen sm:min-h-[820px] w-full max-w-[430px] flex-col justify-between overflow-hidden sm:rounded-[36px] bg-gradient-to-b from-[#4a1728] via-[#5d2034] to-[#340e1b] text-white shadow-2xl border border-white/10">
        {/* Customer Order Page View */}
        {activeAction === "customer-order" ? (
          <div className="flex min-h-screen sm:min-h-[820px] w-full flex-col justify-between bg-[#f4f1f2] text-[#24131a]">
            {/* Top Wine Header */}
            <div className="bg-gradient-to-b from-[#5d152b] to-[#460e20] px-5 pt-6 pb-8 text-white rounded-b-[28px] shadow-md">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction(null);
                    setStatusMessage(null);
                  }}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95"
                >
                  ← Home
                </button>
                <span className="text-sm font-semibold tracking-wide text-rose-100/95">
                  Nyein
                </span>
              </div>

              <h1 className="mt-5 text-lg font-bold tracking-wide">
                Category
              </h1>

              {/* Category Row: Full-visible photo box expands independently without stretching right boxes */}
              <div className="mt-3 grid grid-cols-12 gap-3 items-start">
                <div
                  style={{ transitionDelay: "60ms" }}
                  className={`relative col-span-5 flex flex-col overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm transition-all duration-300 ${uploadedPhotoUrl ? "h-44" : "h-28"
                    } ${boxAnim()}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload cake design photo"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#5d152b]/30 bg-[#fdf8f9] text-[#5d152b] transition hover:border-[#5d152b]/60 hover:bg-rose-50/80 cursor-pointer"
                  >
                    {uploadedPhotoUrl ? (
                      <img
                        src={uploadedPhotoUrl}
                        alt={uploadedPhotoName || "Uploaded Cake Photo"}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-6 w-6 text-[#5d152b] transition-transform group-hover:scale-105"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="mt-1 text-[11px] font-bold">
                          Upload Photo
                        </span>
                        <span className="text-[10px] text-[#7a4b5c]">
                          Tap to choose
                        </span>
                      </>
                    )}
                  </button>

                  {uploadedPhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="mt-1 w-full shrink-0 rounded-lg bg-[#5d152b]/10 py-0.5 text-[10px] font-semibold text-[#5d152b] transition hover:bg-[#5d152b]/20 cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="col-span-7 flex flex-col gap-2">
                  {/* Name on Cake / Recipient Name Input Box (independent height) */}
                  <div
                    style={{ transitionDelay: "130ms" }}
                    className={`flex h-[64px] flex-col justify-center rounded-2xl bg-white px-3.5 py-2 text-left text-[#24131a] shadow-sm ring-2 ring-[#f6be78] ${boxAnim()}`}
                  >
                    <label
                      htmlFor="cake-recipient-name"
                      className="text-[10px] font-semibold uppercase tracking-wide text-[#7a4b5c]"
                    >
                      ကိတ်ပေါ်ရေးမည့်နာမည် / နာမည်
                    </label>
                    <input
                      id="cake-recipient-name"
                      type="text"
                      value={cakeRecipientName}
                      onChange={(e) => setCakeRecipientName(e.target.value)}
                      placeholder="Name on cake..."
                      className="mt-0.5 w-full bg-transparent text-xs font-bold text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                    />
                  </div>

                  {/* Cake Price Number Input Box with Automatic MMK (independent height) */}
                  <div
                    style={{ transitionDelay: "200ms" }}
                    className={`flex h-[40px] flex-col justify-center rounded-2xl bg-white px-3.5 py-1.5 text-left text-[#24131a] shadow-sm ${boxAnim()}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a4b5c]">
                        Price
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          id="cake-price-mmk"
                          type="text"
                          inputMode="numeric"
                          value={cakePriceInput}
                          onChange={handlePriceChange}
                          placeholder="0"
                          className="w-20 bg-transparent text-right text-xs font-bold text-[#5d152b] placeholder:text-[#9b8089] focus:outline-none"
                        />
                        <span className="shrink-0 text-xs font-bold text-[#24131a]">
                          MMK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Specification Section with Animated Boxes */}
            <div className="flex-1 space-y-3 px-5 py-4">
              <h2 className="text-base font-bold text-[#24131a]">
                Specification
              </h2>

              {/* Description on Cake Auto-Expanding Vertical Textarea Box */}
              <div
                style={{ transitionDelay: "260ms" }}
                className={`min-w-0 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 ${boxAnim()}`}
              >
                <label
                  htmlFor="description-on-cake"
                  className="block text-[11px] font-semibold text-[#6e525c]"
                >
                  Description on Cake
                </label>
                <textarea
                  ref={descriptionTextareaRef}
                  id="description-on-cake"
                  rows={1}
                  value={descriptionOnCake}
                  onChange={handleDescriptionChange}
                  placeholder="Write message or text on cake..."
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                  className="mt-1 block min-h-[24px] w-full max-w-full resize-none overflow-hidden whitespace-pre-wrap bg-transparent text-sm font-medium leading-snug text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                />
              </div>

              {/* Cake Color Free-Text Input Row */}
              <div
                style={{ transitionDelay: "340ms" }}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs ${boxAnim()}`}
              >
                <label
                  htmlFor="cake-color-input"
                  className="shrink-0 font-medium text-[#5a3d48]"
                >
                  Cake Color
                </label>
                <input
                  id="cake-color-input"
                  type="text"
                  value={cakeColor}
                  onChange={(e) => setCakeColor(e.target.value)}
                  placeholder="Enter cake color..."
                  className="w-full bg-transparent text-right font-semibold text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                />
              </div>

              {/* Customer Name Input Row */}
              <div
                style={{ transitionDelay: "410ms" }}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs ${boxAnim()}`}
              >
                <label
                  htmlFor="customer-name-input"
                  className="shrink-0 font-medium text-[#5a3d48]"
                >
                  Customer Name
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="w-full bg-transparent text-right font-semibold text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                />
              </div>

              {/* Deli Date Input Row (01-31.01-12.Year auto-dot) */}
              <div
                style={{ transitionDelay: "450ms" }}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs ${boxAnim()}`}
              >
                <label
                  htmlFor="deli-date-input"
                  className="shrink-0 font-medium text-[#5a3d48]"
                >
                  Deli Date
                </label>
                <input
                  id="deli-date-input"
                  type="text"
                  inputMode="numeric"
                  value={deliDate}
                  onChange={handleDeliDateChange}
                  placeholder="DD.MM.YYYY"
                  className="w-full bg-transparent text-right font-semibold text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                />
              </div>

              {/* Ph Input Row (Number only) */}
              <div
                style={{ transitionDelay: "475ms" }}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs ${boxAnim()}`}
              >
                <label
                  htmlFor="ph-input"
                  className="shrink-0 font-medium text-[#5a3d48]"
                >
                  Ph
                </label>
                <input
                  id="ph-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={ph}
                  onChange={handlePhChange}
                  placeholder="Enter phone number..."
                  className="w-full bg-transparent text-right font-semibold text-[#24131a] placeholder:font-normal placeholder:text-[#9b8089] focus:outline-none"
                />
              </div>

              {statusMessage && (
                <p
                  className={`rounded-xl px-3 py-2 text-center text-xs font-medium border ${statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                >
                  {statusMessage.text}
                </p>
              )}
            </div>

            {/* Bottom Save Order Button with Theme Color */}
            <div
              style={{ transitionDelay: "500ms" }}
              className={`bg-white px-5 pt-3 pb-6 border-t border-black/5 ${boxAnim()}`}
            >
              <button
                type="button"
                disabled={isSavingOrder}
                onClick={handleSaveOrder}
                className="h-13 w-full rounded-full bg-gradient-to-r from-[#5d152b] via-[#6e1c35] to-[#460e20] text-sm font-bold text-white shadow-md ring-1 ring-rose-200/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isSavingOrder ? "Saving..." : "Save Order"}
              </button>
            </div>
          </div>
        ) : activeAction === "order-history" && selectedOrderDetail ? (
          /* Read-Only / Editable Order Detail View */
          <div className="flex min-h-screen sm:min-h-[820px] w-full flex-col justify-between bg-[#f4f1f2] text-[#24131a]">
            {/* Top Wine Header */}
            <div className="bg-gradient-to-b from-[#5d152b] to-[#460e20] px-5 pt-6 pb-8 text-white rounded-b-[28px] shadow-md">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderDetail(null);
                    setIsEditingOrder(false);
                    setEditStatusMessage(null);
                  }}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                >
                  ← Back
                </button>
                {isEditingOrder ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingOrder(false);
                      setEditStatusMessage(null);
                    }}
                    className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-rose-100 backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditingOrder(selectedOrderDetail)}
                    className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              <h1 className="mt-5 text-lg font-bold tracking-wide">
                Category
              </h1>

              {/* Category Row */}
              <div className="mt-3 grid grid-cols-12 gap-3 items-start">
                <div
                  className={`relative col-span-5 flex flex-col overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm transition-all duration-300 ${(isEditingOrder ? editPhotoUrl : selectedOrderDetail.photoUrl)
                    ? "h-44"
                    : "h-28"
                    }`}
                >
                  {isEditingOrder ? (
                    <>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        aria-label="Update cake design photo"
                        onChange={handleEditPhotoChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="group relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-[#5d152b]/35 bg-[#fdf8f9] text-[#5d152b] transition hover:border-[#5d152b]/60 hover:bg-rose-50/80 cursor-pointer"
                      >
                        {editPhotoUrl ? (
                          <img
                            src={editPhotoUrl}
                            alt={editPhotoName || editRecipientName}
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <>
                            <CakeIcon className="h-6 w-6 text-[#5d152b]" />
                            <span className="text-[10px] font-bold">
                              Change Photo
                            </span>
                          </>
                        )}
                      </button>
                      {editPhotoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveEditPhoto}
                          className="mt-1 w-full shrink-0 rounded-lg bg-[#5d152b]/10 py-0.5 text-[10px] font-semibold text-[#5d152b] transition hover:bg-[#5d152b]/20 cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-[#5d152b]/15 bg-[#fdf8f9] text-[#5d152b]">
                      {selectedOrderDetail.photoUrl ? (
                        <img
                          src={selectedOrderDetail.photoUrl}
                          alt={
                            selectedOrderDetail.photoName ||
                            selectedOrderDetail.cakeRecipientName
                          }
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <>
                          <CakeIcon className="h-6 w-6 text-[#5d152b]" />
                          <span className="text-[10px] font-medium text-[#7a4b5c]">
                            No Photo
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-7 flex flex-col gap-2">
                  {/* Name on Cake / Recipient Name */}
                  <div className="flex h-[64px] flex-col justify-center rounded-2xl bg-white px-3.5 py-2 text-left text-[#24131a] shadow-sm ring-2 ring-[#f6be78]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a4b5c]">
                      ကိတ်ပေါ်ရေးမည့်နာမည် / နာမည်
                    </span>
                    <input
                      type="text"
                      readOnly={!isEditingOrder}
                      value={
                        isEditingOrder
                          ? editRecipientName
                          : selectedOrderDetail.cakeRecipientName
                      }
                      onChange={(e) => setEditRecipientName(e.target.value)}
                      className={`mt-0.5 w-full bg-transparent text-xs font-bold text-[#24131a] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                        }`}
                    />
                  </div>

                  {/* Price */}
                  <div className="flex h-[40px] flex-col justify-center rounded-2xl bg-white px-3.5 py-1.5 text-left text-[#24131a] shadow-sm">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7a4b5c]">
                        Price
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode={isEditingOrder ? "numeric" : undefined}
                          readOnly={!isEditingOrder}
                          value={
                            isEditingOrder
                              ? editPriceInput
                              : (
                                Number(selectedOrderDetail.priceMmk) || 0
                              ).toLocaleString("en-US")
                          }
                          onChange={(e) =>
                            setEditPriceInput(e.target.value.replace(/[^\d]/g, ""))
                          }
                          className={`w-20 bg-transparent text-right text-xs font-bold text-[#5d152b] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                            }`}
                        />
                        <span className="shrink-0 text-xs font-bold text-[#24131a]">
                          MMK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Specification Section */}
            <div className="flex-1 space-y-3 px-5 py-4">
              <h2 className="text-base font-bold text-[#24131a]">
                Specification
              </h2>

              <div className="min-w-0 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5">
                <span className="block text-[11px] font-semibold text-[#6e525c]">
                  Description on Cake
                </span>
                {isEditingOrder ? (
                  <textarea
                    ref={editDescriptionRef}
                    rows={1}
                    value={editDescription}
                    onChange={(e) => {
                      setEditDescription(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                    className="mt-1 block min-h-[24px] w-full max-w-full resize-none overflow-hidden whitespace-pre-wrap bg-transparent text-sm font-medium leading-snug text-[#24131a] focus:outline-none"
                  />
                ) : (
                  <div
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                    className="mt-1 min-h-[24px] w-full whitespace-pre-wrap text-sm font-medium leading-snug text-[#24131a]"
                  >
                    {selectedOrderDetail.descriptionOnCake || "-"}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs">
                <span className="shrink-0 font-medium text-[#5a3d48]">
                  Cake Color
                </span>
                <input
                  type="text"
                  readOnly={!isEditingOrder}
                  value={
                    isEditingOrder
                      ? editCakeColor
                      : selectedOrderDetail.cakeColor || "-"
                  }
                  onChange={(e) => setEditCakeColor(e.target.value)}
                  className={`w-full bg-transparent text-right font-semibold text-[#24131a] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                    }`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs">
                <span className="shrink-0 font-medium text-[#5a3d48]">
                  Customer Name
                </span>
                <input
                  type="text"
                  readOnly={!isEditingOrder}
                  value={
                    isEditingOrder
                      ? editCustomerName
                      : selectedOrderDetail.customerName || "-"
                  }
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className={`w-full bg-transparent text-right font-semibold text-[#24131a] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                    }`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs">
                <span className="shrink-0 font-medium text-[#5a3d48]">
                  Deli Date
                </span>
                <input
                  type="text"
                  inputMode={isEditingOrder ? "numeric" : undefined}
                  readOnly={!isEditingOrder}
                  value={
                    isEditingOrder
                      ? editDeliDate
                      : selectedOrderDetail.deliDate || "-"
                  }
                  onChange={(e) =>
                    setEditDeliDate(
                      formatDdMmYyyyAutoDot(e.target.value, editDeliDate)
                    )
                  }
                  placeholder={isEditingOrder ? "DD.MM.YYYY" : undefined}
                  className={`w-full bg-transparent text-right font-semibold text-[#24131a] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                    }`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs border border-black/5 text-xs">
                <span className="shrink-0 font-medium text-[#5a3d48]">
                  Ph
                </span>
                <input
                  type="text"
                  inputMode={isEditingOrder ? "numeric" : undefined}
                  pattern={isEditingOrder ? "[0-9]*" : undefined}
                  readOnly={!isEditingOrder}
                  value={
                    isEditingOrder ? editPh : selectedOrderDetail.ph || "-"
                  }
                  onChange={(e) =>
                    setEditPh(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder={isEditingOrder ? "Enter phone number..." : undefined}
                  className={`w-full bg-transparent text-right font-semibold text-[#24131a] focus:outline-none ${isEditingOrder ? "cursor-text" : "cursor-default"
                    }`}
                />
              </div>

              {editStatusMessage && (
                <p
                  className={`rounded-xl px-3 py-2 text-center text-xs font-medium border ${editStatusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                >
                  {editStatusMessage.text}
                </p>
              )}
            </div>

            {/* Bottom Action Button: Update Order when editing, Back to Order History when viewing */}
            <div className="bg-white px-5 pt-3 pb-6 border-t border-black/5">
              {isEditingOrder ? (
                <button
                  type="button"
                  disabled={isUpdatingOrder}
                  onClick={handleUpdateOrder}
                  className="h-13 w-full rounded-full bg-gradient-to-r from-[#5d152b] via-[#6e1c35] to-[#460e20] text-sm font-bold text-white shadow-md ring-1 ring-rose-200/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isUpdatingOrder ? "Updating..." : "Update Order"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderDetail(null);
                    setEditStatusMessage(null);
                  }}
                  className="h-13 w-full rounded-full bg-gradient-to-r from-[#5d152b] via-[#6e1c35] to-[#460e20] text-sm font-bold text-white shadow-md ring-1 ring-rose-200/30 transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                >
                  Back to Order History
                </button>
              )}
            </div>
          </div>
        ) : activeAction === "order-history" ? (
          /* Order History View with Calendar Strip, Order Badge & Today Shortcut */
          <div className="flex min-h-screen sm:min-h-[820px] w-full flex-col justify-between bg-[#f4f1f2] text-[#24131a]">
            {/* Top Wine Header + Horizontal Calendar (or List Header) */}
            <div className="bg-gradient-to-b from-[#5d152b] to-[#460e20] px-5 pt-6 pb-6 text-white rounded-b-[28px] shadow-md">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                >
                  ← Home
                </button>
                <span className="text-sm font-semibold tracking-wide text-rose-100/95">
                  Nyein
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h1 className="text-lg font-bold tracking-wide">
                  Order History
                </h1>

                {historyViewMode === "calendar" && (
                  <button
                    type="button"
                    onClick={handleTodayClick}
                    className="rounded-full border border-white/20 bg-[#3a1f28]/80 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#4a2834] active:scale-95 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              {historyViewMode === "calendar" && (
                /* Horizontal Calendar Strip (Past 6 days + Today + Next 30 days) */
                <div
                  ref={calendarScrollRef}
                  className="mt-4 flex items-end gap-2 overflow-x-auto pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {calendarDays.map((item) => {
                    const isSelected = item.key === selectedDateKey;
                    const hasOrders = (orderCountByDateKey[item.key] || 0) > 0;
                    const showMonthHeader = item.isMonthStart;

                    return (
                      <div
                        key={item.key}
                        className="relative flex shrink-0 flex-col items-center"
                      >
                        {/* Top "Order" pill badge above the date box */}
                        {hasOrders && (
                          <span
                            className={`z-10 -mb-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide shadow-xs ${isSelected
                              ? "bg-white text-[#24131a] ring-1 ring-[#5d152b]/20"
                              : "bg-[#f4f1f2] text-[#24131a]"
                              }`}
                          >
                            Order
                          </span>
                        )}

                        <button
                          ref={(el) => {
                            dayButtonRefs.current[item.key] = el;
                          }}
                          type="button"
                          onClick={() => setSelectedDateKey(item.key)}
                          className={`flex h-22 w-13 shrink-0 flex-col items-center justify-between overflow-hidden rounded-2xl transition cursor-pointer ${isSelected
                            ? "bg-white text-[#24131a] shadow-md"
                            : "bg-[#3a1f28]/65 text-white hover:bg-[#492732]/85"
                            } ${showMonthHeader ? "pb-2" : "py-2.5"} ${hasOrders ? "pt-3" : ""
                            }`}
                        >
                          {showMonthHeader ? (
                            <span
                              className={`w-full py-0.5 text-center text-[10px] font-bold tracking-wide ${isSelected
                                ? "bg-[#5d152b] text-white"
                                : "bg-white/15 text-rose-100"
                                }`}
                            >
                              {item.monthShort}
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] font-medium ${isSelected ? "text-[#5a3d48]" : "text-white/85"
                                }`}
                            >
                              {item.weekdayShort}
                            </span>
                          )}

                          {showMonthHeader && (
                            <span
                              className={`text-[10px] font-medium leading-none ${isSelected ? "text-[#5a3d48]" : "text-white/80"
                                }`}
                            >
                              {item.weekdayShort}
                            </span>
                          )}

                          <span className="text-lg font-bold leading-none">
                            {item.dayNumber}
                          </span>

                          <span className="flex h-2 w-2 items-center justify-center">
                            {item.isToday && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[#24131a]" : "bg-rose-200"
                                  }`}
                              />
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order History Body: Selected Deli Date List or All Orders Grouped by Deli Date */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {isLoadingOrders ? (
                <p className="py-8 text-center text-xs text-[#6e525c]">
                  Loading orders...
                </p>
              ) : historyViewMode === "list" ? (
                groupedOrdersByDeliDate.length === 0 ? (
                  <div className="flex h-full min-h-[220px] items-center justify-center text-center text-xs text-[#7a5b66]">
                    No orders found
                  </div>
                ) : (
                  groupedOrdersByDeliDate.map((group) => (
                    <div key={group.sortKey + group.heading} className="space-y-2">
                      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl bg-[#e9e1e4] px-3 py-1.5 text-xs font-bold text-[#5d152b] shadow-2xs">
                        <span>{group.heading}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#24131a]">
                          {group.items.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {group.items.map((ord, idx) => (
                          <div
                            key={`${group.sortKey}-${ord._id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedOrderDetail(ord);
                              setIsEditingOrder(false);
                              setEditStatusMessage(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedOrderDetail(ord);
                                setIsEditingOrder(false);
                                setEditStatusMessage(null);
                              }
                            }}
                            style={{
                              animationDelay: `${Math.min(idx * 55, 420)}ms`,
                            }}
                            className="menu-photo-reveal flex w-full items-center justify-between gap-2.5 rounded-2xl bg-white p-3 text-left shadow-xs border border-black/5 transition hover:border-[#5d152b]/30 hover:bg-rose-50/30 active:scale-[0.99] cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {ord.photoUrl ? (
                                <img
                                  src={ord.photoUrl}
                                  alt={ord.photoName || ord.cakeRecipientName}
                                  className="h-11 w-11 shrink-0 rounded-xl object-cover border border-black/10"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f1f2] text-[#5d152b]">
                                  <CakeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#24131a] truncate">
                                  {ord.cakeRecipientName}
                                </div>
                                <div className="text-[11px] text-[#6e525c] truncate">
                                  {ord.customerName}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#5d152b]">
                                {formatMmk(Number(ord.priceMmk) || 0)}
                              </span>
                              <button
                                type="button"
                                disabled={deletingOrderId === ord._id}
                                onClick={(e) => handleDeleteOrder(e, ord._id)}
                                aria-label="Delete order"
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#7a4b5c] transition hover:bg-rose-100 hover:text-rose-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )
              ) : ordersForSelectedDate.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center text-center text-xs text-[#7a5b66]">
                  No orders on this Deli Date
                </div>
              ) : (
                ordersForSelectedDate.map((ord, idx) => (
                  <div
                    key={`date-${ord._id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedOrderDetail(ord);
                      setIsEditingOrder(false);
                      setEditStatusMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedOrderDetail(ord);
                        setIsEditingOrder(false);
                        setEditStatusMessage(null);
                      }
                    }}
                    style={{
                      animationDelay: `${Math.min(idx * 55, 420)}ms`,
                    }}
                    className="menu-photo-reveal flex w-full items-center justify-between gap-2.5 rounded-2xl bg-white p-3 text-left shadow-xs border border-black/5 transition hover:border-[#5d152b]/30 hover:bg-rose-50/30 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ord.photoUrl ? (
                        <img
                          src={ord.photoUrl}
                          alt={ord.photoName || ord.cakeRecipientName}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover border border-black/10"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f1f2] text-[#5d152b]">
                          <CakeIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#24131a] truncate">
                          {ord.cakeRecipientName}
                        </div>
                        <div className="text-[11px] text-[#6e525c] truncate">
                          {ord.customerName}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#5d152b]">
                        {formatMmk(Number(ord.priceMmk) || 0)}
                      </span>
                      <button
                        type="button"
                        disabled={deletingOrderId === ord._id}
                        onClick={(e) => handleDeleteOrder(e, ord._id)}
                        aria-label="Delete order"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#7a4b5c] transition hover:bg-rose-100 hover:text-rose-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Centered Toggle Button: "List ဖြင့်ကြည့်ရန်" / "Calendar ဖြင့်ကြည့်ရန်" */}
            <div className="flex items-center justify-center bg-[#f4f1f2] px-5 pt-3 pb-6">
              <button
                type="button"
                onClick={() =>
                  setHistoryViewMode((prev) =>
                    prev === "calendar" ? "list" : "calendar"
                  )
                }
                className="rounded-full bg-gradient-to-r from-[#5d152b] via-[#6e1c35] to-[#460e20] px-7 py-2.5 text-xs font-bold text-white shadow-md ring-1 ring-rose-200/30 transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                {historyViewMode === "calendar"
                  ? "List ဖြင့်ကြည့်ရန်"
                  : "Calendar ဖြင့်ကြည့်ရန်"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Background Cake Image (/photocake.png) shifted 1/4 right */}
            {!bgCakeError && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                <img
                  src="/photocake.png"
                  alt="Nyein Cake Background"
                  onError={() => setBgCakeError(true)}
                  className="h-full w-full translate-x-[25%] scale-100 object-cover object-center opacity-85"
                />
              </div>
            )}

            {/* Soft Contrast Scrim for Text & Button Readability */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/45 via-black/15 to-black/55" />

            {/* Landing Screen Content (Zooms/fades as user steps into circle) */}
            <div
              className={`relative z-10 flex flex-1 flex-col justify-between px-6 pt-10 pb-8 transition-all duration-500 ease-in ${isInsideCircle
                ? "pointer-events-none opacity-0 scale-125"
                : isEnteringCircle
                  ? "opacity-25 scale-110"
                  : "opacity-100 scale-100"
                }`}
            >
              {/* Top Brand & Sweet Headline */}
              <header className="text-center">
                <div className="font-script-brand text-3xl sm:text-4xl text-white tracking-wide drop-shadow">
                  Nyein
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.26em] text-white/85 drop-shadow-xs">
                  Birthday Cake
                </div>

                <h1 className="mt-7 text-3xl sm:text-[34px] font-bold leading-tight tracking-tight text-white drop-shadow-md">
                  Order Note and
                  <br />
                  Menu
                </h1>
              </header>

              {/* Center Circle Portal Button */}
              <section className="my-6 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleEnterCircle}
                  aria-label="Step inside cake circle"
                  className={`group relative flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-b from-[#8f3e58]/80 via-[#7c354c]/80 to-[#6b2c41]/80 p-3 shadow-2xl ring-2 ring-rose-200/45 backdrop-blur-xs cursor-pointer focus:outline-none transition-transform duration-500 ease-in ${isEnteringCircle
                    ? "scale-[3.4] ring-rose-200/80 shadow-[0_0_80px_rgba(244,114,182,0.5)]"
                    : "scale-100 hover:scale-[1.03]"
                    }`}
                >
                  {!heroImgError ? (
                    <img
                      src="/today-cake.jpg"
                      alt="Nyein Cake"
                      onError={() => setHeroImgError(true)}
                      className="h-full w-full rounded-full object-cover shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <FallbackCakeArt compact />
                  )}
                </button>
              </section>

              {/* Bottom Action Buttons */}
              <footer className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* Customer Order Pill Button */}
                  <button
                    type="button"
                    onClick={() => setActiveAction("customer-order")}
                    className={`flex h-14 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium backdrop-blur-md transition active:scale-[0.98] ${activeAction === "customer-order"
                      ? "bg-white/25 border border-white/60 text-white ring-2 ring-pink-300/70"
                      : "bg-[#562338]/75 hover:bg-[#562338]/90 border border-white/30 text-white/95"
                      }`}
                  >
                    Customer Order
                  </button>

                  {/* Order History Pill Button */}
                  <button
                    type="button"
                    onClick={() => setActiveAction("order-history")}
                    className={`flex h-14 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium backdrop-blur-md transition active:scale-[0.98] ${activeAction === "order-history"
                      ? "bg-white/25 border border-white/60 text-white ring-2 ring-pink-300/70"
                      : "bg-[#562338]/75 hover:bg-[#562338]/90 border border-white/30 text-white/95"
                      }`}
                  >
                    Order History
                  </button>
                </div>
              </footer>
            </div>

            {/* Inside Circle View (Cake Photos Only: Straddling Our Collections & Popular Picks) */}
            <div
              className={`absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#f2d5da] via-[#ebd0d5] to-[#e3c3c9] text-[#3d1726] transition-all duration-500 ease-out [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isInsideCircle
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-75 pointer-events-none"
                }`}
            >
              <input
                ref={menuUploadInputRef}
                type="file"
                accept="image/*"
                aria-label="Add cake photo to menu"
                onChange={handleMenuPhotoAdd}
                className="hidden"
              />

              <div>
                {/* Upper Section: Wine Top Half + Straddling Large Cake Photo Cards */}
                <div className="relative">
                  <div className="h-44 w-full rounded-b-[28px] bg-gradient-to-b from-[#5d152b] to-[#460e20] px-5 pt-6 text-white shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tracking-wide text-rose-100/95">
                        Nyein
                      </span>
                      <div className="flex items-center gap-2">
                        {isMenuEditing && (
                          <span className="text-[10px] font-medium text-rose-100/85">
                            {isSavingMenu ? "Saving..." : menuSaveNotice || ""}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isMenuEditing) {
                              persistMenuToDb(collections, popularPicks);
                            }
                            setIsMenuEditing((prev) => !prev);
                            draggingMenuRef.current = null;
                            setDraggingMenu(null);
                          }}
                          className="rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                        >
                          {isMenuEditing ? "Done" : "Menu Edit"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <h2 className="text-lg font-bold tracking-wide">
                        Our Collections
                      </h2>
                      {isMenuEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuUploadTarget("collections");
                            menuUploadInputRef.current?.click();
                          }}
                          className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/30 cursor-pointer"
                        >
                          + Add Photo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Large Cake Cards Straddling Top Half (Wine) & Bottom Half (Pink) */}
                  <div
                    className={`-mt-16 flex gap-3 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${draggingMenu?.section === "collections"
                      ? "overflow-x-clip"
                      : "overflow-x-auto"
                      }`}
                  >
                    {collections.map((col, idx) => {
                      const isDraggingThis =
                        draggingMenu?.section === "collections" &&
                        draggingMenu.fromIndex === idx;
                      const isTargetThis =
                        draggingMenu?.section === "collections" &&
                        draggingMenu.overIndex === idx &&
                        draggingMenu.fromIndex !== idx;

                      return (
                        <div
                          key={col.id}
                          ref={(el) => {
                            collectionCardRefs.current[idx] = el;
                          }}
                          onPointerDown={(e) =>
                            handleMenuItemPointerDown(e, "collections", idx)
                          }
                          onPointerMove={(e) =>
                            handleMenuItemPointerMove(e, "collections")
                          }
                          onPointerUp={() => {
                            finishMenuItemDrag();
                            if (!isMenuEditing && !heroImgError) {
                              setPreviewCake({
                                img: col.img,
                                title: "Our Collection",
                                list: "collections",
                                index: idx,
                              });
                            }
                          }}
                          onPointerCancel={finishMenuItemDrag}
                          style={{
                            touchAction: isMenuEditing ? "none" : "auto",
                          }}
                          className={`relative flex h-36 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md transition-transform duration-150 select-none ${isMenuEditing ? "cursor-grab active:cursor-grabbing" : ""
                            } ${isDraggingThis
                              ? "z-30 scale-105 ring-2 ring-[#5d152b] opacity-90 shadow-xl"
                              : isTargetThis
                                ? "scale-[0.97] ring-2 ring-[#f6be78]"
                                : ""
                            }`}
                        >
                          {!heroImgError ? (
                            <img
                              src={col.img}
                              alt="Cake collection"
                              draggable={false}
                              onError={() => setHeroImgError(true)}
                              className="block h-full w-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#5d152b]">
                              <CakeIcon className="h-9 w-9 text-white" />
                            </div>
                          )}

                          {isMenuEditing && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMenuPhoto("collections", col.id)}
                              aria-label="Remove collection cake photo"
                              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Picks Large Cake Photos Grid Section */}
                <div className="mt-4 px-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#351321]">
                      Popular Picks
                    </h3>
                    {isMenuEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuUploadTarget("picks");
                          menuUploadInputRef.current?.click();
                        }}
                        className="rounded-full bg-[#5d152b]/15 px-3 py-1 text-[11px] font-semibold text-[#5d152b] transition hover:bg-[#5d152b]/25 cursor-pointer"
                      >
                        + Add Photo
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2.5 pb-24">
                    {popularPicks.map((pick, idx) => {
                      const isDraggingThis =
                        draggingMenu?.section === "picks" &&
                        draggingMenu.fromIndex === idx;
                      const isTargetThis =
                        draggingMenu?.section === "picks" &&
                        draggingMenu.overIndex === idx &&
                        draggingMenu.fromIndex !== idx;

                      return (
                        <div
                          key={pick.id}
                          ref={(el) => {
                            pickCardRefs.current[idx] = el;
                          }}
                          onClick={() => {
                            if (!isMenuEditing && !heroImgError) {
                              setPreviewCake({
                                img: pick.img,
                                title: "Popular Cake",
                                list: "picks",
                                index: idx,
                              });
                            }
                          }}
                          onPointerDown={(e) =>
                            handleMenuItemPointerDown(e, "picks", idx)
                          }
                          onPointerMove={(e) =>
                            handleMenuItemPointerMove(e, "picks")
                          }
                          onPointerUp={finishMenuItemDrag}
                          onPointerCancel={finishMenuItemDrag}
                          style={{
                            touchAction: isMenuEditing ? "none" : "auto",
                            animationDelay: `${Math.min(180 + idx * 60, 600)}ms`,
                          }}
                          className={`${isInsideCircle ? "menu-photo-reveal" : "opacity-0"
                            } relative flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl shadow-xs transition-transform duration-150 select-none ${isMenuEditing ? "cursor-grab active:cursor-grabbing" : ""
                            } ${isDraggingThis
                              ? "z-30 scale-105 ring-2 ring-[#5d152b] opacity-90 shadow-xl"
                              : isTargetThis
                                ? "scale-[0.96] ring-2 ring-[#f6be78]"
                                : ""
                            }`}
                        >
                          {!heroImgError ? (
                            <img
                              src={pick.img}
                              alt="Popular cake"
                              draggable={false}
                              onError={() => setHeroImgError(true)}
                              className="block h-full w-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#5d152b]">
                              <CakeIcon className="h-8 w-8 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showSplash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#2b0914] via-[#1a070d] to-[#120408] px-6 text-center text-white transition-opacity duration-300">
          <div className="flex flex-col items-center">
            <span className="font-serif text-3xl italic tracking-wide text-rose-100">
              Nyein
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.28em] text-rose-200/80 uppercase">
              PATISSERIE
            </span>
            <div className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-rose-200/30 border-t-rose-100" />
          </div>
        </div>
      )}

      {isInsideCircle && (
        <button
          type="button"
          onClick={handleExitCircle}
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
          }}
          className="rounded-full border border-[#5d293e]/30 bg-[#5d293e] px-6 py-2.5 text-xs font-semibold tracking-wide text-white shadow-xl transition hover:bg-[#491e30] active:scale-95 cursor-pointer"
        >
          ← Step Back Out
        </button>
      )}

      {previewCake && (() => {
        const activeList =
          previewCake.list === "collections" ? collections : popularPicks;
        const stepPreviewCake = (delta: number) => {
          if (activeList.length === 0) return;
          const currentIdx =
            typeof previewCake.index === "number" && previewCake.index >= 0
              ? previewCake.index
              : 0;
          const nextIndex =
            (currentIdx + delta + activeList.length) % activeList.length;
          const nextItem = activeList[nextIndex];
          if (!nextItem || !nextItem.img) return;
          setPreviewCake({
            ...previewCake,
            img: nextItem.img,
            index: nextIndex,
          });
        };

        const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          try {
            const compressedItems = await Promise.all(
              Array.from(files).map(async (file, i) => ({
                id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                img: await compressImageFile(file, 600, 0.6),
                darkBg: false,
              }))
            );

            if (menuUploadTarget === "collections") {
              setCollections((prev) => [...prev, ...compressedItems]);
            } else {
              setPopularPicks((prev) => [...prev, ...compressedItems]);
            }
          } catch (err) {
            console.error("Image compression failed:", err);
          } finally {
            e.target.value = "";
          }
        };

        return (
          <div
            onClick={() => setPreviewCake(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#f3d5dc] p-3 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setPreviewCake(null)}
                aria-label="Close preview"
                className="absolute top-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-sm font-semibold text-white transition hover:bg-black/85 cursor-pointer"
              >
                ✕
              </button>

              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white/40">
                <img
                  src={previewCake.img}
                  alt={previewCake.title || "Cake preview"}
                  className="h-full w-full object-cover"
                />

                {activeList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => stepPreviewCake(-1)}
                      aria-label="Previous cake"
                      className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-lg font-bold text-white shadow-md backdrop-blur-xs transition hover:bg-black/75 active:scale-95 cursor-pointer"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => stepPreviewCake(1)}
                      aria-label="Next cake"
                      className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-lg font-bold text-white shadow-md backdrop-blur-xs transition hover:bg-black/75 active:scale-95 cursor-pointer"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setUploadedPhotoUrl(previewCake.img);
                  setUploadedPhotoName("Selected Cake Design");
                  setActiveAction("customer-order");
                  setPreviewCake(null);
                }}
                className="mt-3 w-full rounded-2xl bg-[#5d152b] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#491021] active:scale-[0.99] cursor-pointer"
              >
                ထိုcake အားရွေးချယ်မည်။
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
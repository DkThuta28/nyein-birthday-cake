import mongoose, { Schema, Model } from "mongoose";

export interface IOrder {
  cakeRecipientName: string;
  priceMmk: number;
  descriptionOnCake: string;
  cakeColor: string;
  customerName: string;
  deliDate: string;
  deliDateKey: string;
  ph: string;
  photoUrl: string;
  photoName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    cakeRecipientName: { type: String, required: true, trim: true },
    priceMmk: { type: Number, default: 0 },
    descriptionOnCake: { type: String, default: "", trim: true },
    cakeColor: { type: String, default: "", trim: true },
    customerName: { type: String, required: true, trim: true },
    deliDate: { type: String, default: "" },
    deliDateKey: { type: String, default: "" },
    ph: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    photoName: { type: String, default: "" },
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
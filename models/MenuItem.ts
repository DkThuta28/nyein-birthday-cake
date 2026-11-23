import mongoose, { Schema, Model } from "mongoose";

export interface IMenuPhoto {
  id: string;
  img: string;
  darkBg: boolean;
}

export interface IMenuItem {
  key: string;
  collections: IMenuPhoto[];
  popularPicks: IMenuPhoto[];
  createdAt?: Date;
  updatedAt?: Date;
}

const MenuPhotoSchema = new Schema<IMenuPhoto>(
  {
    id: { type: String, required: true },
    img: { type: String, required: true },
    darkBg: { type: Boolean, default: false },
  },
  { _id: false }
);

const MenuItemSchema = new Schema<IMenuItem>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    collections: { type: [MenuPhotoSchema], default: [] },
    popularPicks: { type: [MenuPhotoSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "menu_items",
  }
);

const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);

export default MenuItem;
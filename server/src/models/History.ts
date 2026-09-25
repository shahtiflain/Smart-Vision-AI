import mongoose, { Schema, Document } from 'mongoose';

export interface IHistory extends Document {
  uid: string;
  intent: string;
  question?: string;
  response: string;
  confidence: number;
  createdAt: Date;
}

const HistorySchema: Schema = new Schema({
  uid: { type: String, required: true },
  intent: { type: String, required: true },
  question: { type: String },
  response: { type: String, required: true },
  confidence: { type: Number, required: true },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

HistorySchema.index({ uid: 1, createdAt: -1 });

export const History = mongoose.model<IHistory>('History', HistorySchema);

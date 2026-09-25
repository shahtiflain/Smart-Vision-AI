import mongoose, { Schema, Document } from 'mongoose';

export interface IPreferences extends Document {
  uid: string;
  speechRate: number;
  verbosity: 'short' | 'detailed';
}

const PreferencesSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true, index: true },
  speechRate: { type: Number, default: 1.0, min: 0.5, max: 2.0 },
  verbosity: { type: String, enum: ['short', 'detailed'], default: 'short' },
});

export const Preferences = mongoose.model<IPreferences>('Preferences', PreferencesSchema);

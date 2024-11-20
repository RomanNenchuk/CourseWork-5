import mongoose from "mongoose";
import Room from "./models/Room.js";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mydatabase");
    console.log("Connected to DB");

    // Очистити активність користувачів
    await Room.updateMany(
      { "participants.active": true }, // Знаходимо всі кімнати, де учасники активні
      { $set: { "participants.$[].active": false } } // Оновлюємо статус активності всіх учасників
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

export default connectDB;

import mongoose from "mongoose";
import Room from "./models/Room.js";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mydatabase");
    console.log("Connected to DB");
    await Room.updateMany(
      { "participants.active": true },
      { $set: { "participants.$[].active": false } }
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

export default connectDB;

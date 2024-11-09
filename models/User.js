import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  socketID: { type: String, required: true },
  currentRoom: { type: String, required: true },
  password: { type: String, required: true },
  publicKey: { type: String, required: false },
  roomList: [{ roomName: { type: String } }],
});

const User = mongoose.model("User", userSchema);
export default User;

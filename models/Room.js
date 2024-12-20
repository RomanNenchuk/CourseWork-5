import mongoose from "mongoose";
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  roomName: {
    type: String,
    required: true,
    unique: true,
  },
  roomPassword: {
    type: String,
    required: true,
  },
  participants: [
    {
      _id: false,
      userName: { type: String, required: true },
      active: { type: Boolean, required: true },
      encryptedSymmetricKey: { type: String, required: false },
    },
  ],
  adminEmail: {
    type: String,
    required: false,
  },
  requests: [
    {
      userName: { type: String, required: true },
      publicKey: { type: String, required: true },
    },
  ],
});

const Room = mongoose.model("Room", roomSchema);
export default Room;

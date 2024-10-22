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
      userName: { type: String, required: true },
      active: { type: Boolean, required: true },
    },
  ],
});

const Room = mongoose.model("Room", roomSchema);
export default Room;

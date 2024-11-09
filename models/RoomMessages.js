import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  messages: [
    {
      name: { type: String, required: true },
      text: { type: String, required: true },
      iv: { type: String, required: true },
      time: { type: String, required: true },
      deleted: { type: Boolean, default: false },
      edited: { type: Boolean, default: false },
    },
  ],
});

const Message = mongoose.model("RoomMessages", messageSchema);
export default Message;

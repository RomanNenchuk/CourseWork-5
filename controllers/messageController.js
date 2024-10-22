import Message from "../models/RoomMessages.js";

// Встановити повідомлення у кімнаті
export const setMessage = async (msg, room) => {
  try {
    const roomMessages = await Message.findOne({ room });

    if (roomMessages) {
      roomMessages.messages.push({
        name: msg.name,
        text: msg.text,
        time: msg.time,
      });
      await roomMessages.save();
    } else {
      const newRoom = new Message({
        room,
        messages: [msg],
      });
      await newRoom.save();
    }
  } catch (error) {
    console.error("Помилка при записі повідомлення в БД:", error);
  }
};

// Отримати попередні повідомлення кімнати
export const getPrevMessages = async (room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    if (roomMessages) {
      return roomMessages.messages;
    }
    return null;
  } catch (error) {
    console.error("Помилка при отриманні повідомлень кімнати:", error);
  }
};

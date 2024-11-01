import Message from "../models/RoomMessages.js";

// Встановити повідомлення у кімнаті
export const setMessage = async (msg, room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    let roomID;
    if (roomMessages) {
      roomMessages.messages.push({
        name: msg.name,
        text: msg.text,
        time: msg.time,
      });
      roomID = await roomMessages.save();
    } else {
      const newRoom = new Message({
        room,
        messages: [msg],
      });
      roomID = await newRoom.save();
    }
    return roomID;
  } catch (error) {
    console.error("Помилка при записі повідомлення в БД:", error);
  }
};

// Отримати попередні повідомлення кімнати
export const getPrevMessages = async (room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    if (roomMessages && roomMessages.messages) {
      // Фільтруємо повідомлення, щоб отримати тільки не видалені
      return roomMessages.messages.filter((message) => !message.deleted);
    }
    return null;
  } catch (error) {
    console.error("Помилка при отриманні повідомлень кімнати:", error);
  }
};

export const deleteMessage = async (room, id) => {
  try {
    const updatedMessage = await Message.findOneAndUpdate(
      { "messages._id": id }, // Знаходимо повідомлення за _id
      { $set: { "messages.$.deleted": true } }, // Позначаємо його як видалене
      { new: true } // Повертаємо оновлений документ
    );
  } catch (error) {
    console.error("Помилка при видаленні повідомлення:", error);
  }
};

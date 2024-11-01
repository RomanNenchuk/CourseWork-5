import Message from "../models/RoomMessages.js";

// Встановити повідомлення у кімнаті
export const setMessage = async (msg, room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    let messageID;
    if (roomMessages) {
      roomMessages.messages.push({
        name: msg.name,
        text: msg.text,
        time: msg.time,
      });
      await roomMessages.save();
      messageID = roomMessages.messages[roomMessages.messages.length - 1]._id;
    } else {
      const newRoom = new Message({
        room,
        messages: [msg],
      });
      const savedRoom = await newRoom.save();
      messageID = savedRoom.messages[0]._id;
    }
    return messageID;
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
      { "messages._id": id },
      { $set: { "messages.$.deleted": true } },
      { new: true }
    );
  } catch (error) {
    console.error("Помилка при видаленні повідомлення:", error);
  }
  ``;
};

export const updateMessage = async (room, id, updatedMessage) => {
  try {
    const newMessage = await Message.findOneAndUpdate(
      { "messages._id": id },
      { $set: { "messages.$.text": updatedMessage } },
      { new: true }
    );

    if (!newMessage) {
      console.error("Повідомлення не знайдено для оновлення");
      return null;
    }
  } catch (error) {
    console.error("Помилка при редагуванні повідомлення:", error);
  }
};

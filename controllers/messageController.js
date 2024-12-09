import Message from "../models/RoomMessages.js";

export const buildMsg = (name, text, iv) => ({
  name,
  text,
  iv,
  time: new Intl.DateTimeFormat("default", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date()),
});

export const setMessage = async (msg, room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    let messageID;
    if (roomMessages) {
      roomMessages.messages.push({
        name: msg.name,
        text: msg.text,
        iv: msg.iv,
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

export const getPrevMessages = async (room) => {
  try {
    const roomMessages = await Message.findOne({ room });
    if (roomMessages && roomMessages.messages) {
      return roomMessages.messages;
    }
    return null;
  } catch (error) {
    console.error("Помилка при отриманні повідомлень кімнати:", error);
  }
};

export const deleteMessage = async (room, id) => {
  try {
    const updatedMessage = await Message.findOneAndUpdate(
      { room },
      { $pull: { messages: { _id: id } } },
      { new: true }
    );

    if (!updatedMessage) {
      console.error("Повідомлення або кімната не знайдені.");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Помилка при видаленні повідомлення:", error);
    return false;
  }
};

export const updateMessage = async (room, id, updatedMessage, iv) => {
  try {
    const newMessage = await Message.findOneAndUpdate(
      { "messages._id": id },
      {
        $set: {
          "messages.$.text": updatedMessage,
          "messages.$.iv": iv,
          "messages.$.edited": true,
        },
      },
      { new: true }
    );

    if (!newMessage) {
      console.error("Повідомлення не знайдено для оновлення");
      return null;
    }

    return newMessage;
  } catch (error) {
    console.error("Помилка при редагуванні повідомлення:", error);
  }
};

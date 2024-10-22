import Room from "../models/Room.js";

// Отримати список користувачів у кімнаті
export const getUsersInRoom = async (roomName) => {
  try {
    const room = await Room.findOne({ roomName }).select("participants");

    if (room) {
      const users = room.participants
        .filter((participant) => participant.active)
        .map((participant) => participant.userName);
      return users;
    } else {
      return [];
    }
  } catch (error) {
    console.error(
      `Помилка при отриманні учасників кімнати ${roomName}:`,
      error
    );
    throw error;
  }
};

// Отримати всі активні кімнати
export const getAllActiveRooms = async () => {
  try {
    const activeRooms = await Room.find({
      "participants.active": true,
    }).select("roomName");

    return activeRooms.map((room) => room.roomName);
  } catch (error) {
    console.error("Помилка при отриманні активних кімнат:", error);
    throw error;
  }
};

// Отримуємо всі кімнати, назва яких містить підрядок roomName, та кількість учасників відповідає participNumber
export const getRoomsByNameAndCount = async (roomName, participNumber) => {
  try {
    const rooms = await Room.find({
      roomName: { $regex: roomName, $options: "i" }, // Пошук кімнат, що містять підрядок roomName (без урахування регістру)
    }).select("roomName participants");

    // Фільтруємо кімнати за мінімальною кількістю учасників
    const filteredRooms = rooms.filter(
      (room) => room.participants.length >= participNumber
    );

    // Повертаємо об'єкт з іменем кімнати та кількістю учасників
    return filteredRooms.map((room) => ({
      roomName: room.roomName,
      totalParticipants: room.participants.length, // загальна кількість учасників
    }));
  } catch (error) {
    console.error("Помилка при отриманні кімнат з учасниками:", error);
    throw error;
  }
};

// Перевірити, чи існує кімната
export const roomExists = async (roomName) => {
  try {
    const room = await Room.findOne({ roomName });
    return !!room;
  } catch (error) {
    console.error("Помилка при перевірці кімнати:", error);
    return false;
  }
};

// Перевірити, чи користувач був у кімнаті
export const wasInRoom = async (username, roomName) => {
  try {
    const room = await Room.findOne({
      roomName,
      participants: { $elemMatch: { userName: username } },
    });

    return !!room;
  } catch (error) {
    console.error("Помилка при перевірці користувача в кімнаті:", error);
    return false;
  }
};

export const verifyRoomPassword = async (roomName, password) => {
  try {
    const room = await Room.findOne({ roomName });
    if (!room || room.roomPassword !== password) {
      return false;
    }
    return true;
  } catch (error) {
    console.error("Помилка під час перевірки:", error);
    return false;
  }
};

// Додати користувача до кімнати
export const addUserToRoom = async (roomName, userName) => {
  try {
    const updatedRoom = await Room.findOneAndUpdate(
      { roomName },
      { $push: { participants: { userName, active: true } } },
      { new: true, useFindAndModify: false }
    );
  } catch (error) {
    console.error("Помилка при додаванні користувача до кімнати:", error);
  }
};

// Створити нову кімнату з користувачем
export const createRoomWithUser = async (roomName, userName, roomPassword) => {
  try {
    const newRoom = new Room({
      roomName,
      roomPassword,
      participants: [{ userName, active: true }],
    });

    const savedRoom = await newRoom.save();
  } catch (error) {
    console.error("Помилка при створенні кімнати:", error);
  }
};

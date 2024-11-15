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
    const query = roomName
      ? { roomName: { $regex: roomName, $options: "i" } } // Якщо є roomName, шукаємо за ним
      : {}; // Якщо roomName не задано, повертаємо всі кімнати

    const rooms = await Room.find(query).select("roomName participants");

    // Фільтруємо кімнати за кількістю учасників
    const filteredRooms = rooms.filter(
      (room) => room.participants.length >= participNumber
    );

    // Повертаємо об'єкт з іменем кімнати, кількістю учасників та активністю
    return filteredRooms.map((room) => ({
      roomName: room.roomName,
      totalParticipants: room.participants.length, // загальна кількість учасників
      isActive: room.participants.some((participant) => participant.active), // перевіряємо, чи є активні учасники
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
    const room = await Room.findOne({ roomName });

    if (!room) {
      throw new Error("Кімнату не знайдено");
    }

    // Перевірка, чи існує користувач у списку учасників
    const userExists = room.participants.some(
      (participant) => participant.userName === userName
    );

    if (userExists) {
      console.log("Користувач вже є у кімнаті");
      return room; // Повертаємо поточний стан кімнати, якщо користувач вже є
    }

    // Додаємо користувача, якщо його немає
    const updatedRoom = await Room.findOneAndUpdate(
      { roomName },

      // тут було true, встановив у false

      { $push: { participants: { userName, active: false } } },
      { new: true, useFindAndModify: false }
    );

    return updatedRoom; // Повертаємо оновлену кімнату з новим учасником
  } catch (error) {
    console.error("Помилка при додаванні користувача до кімнати:", error);
  }
};

// Створити нову кімнату з користувачем
export const createRoomWithUser = async (
  roomName,
  userName,
  roomPassword,
  adminEmail
) => {
  try {
    const newRoom = new Room({
      roomName,
      roomPassword,
      participants: [{ userName, active: true }],
      adminEmail,
    });

    const savedRoom = await newRoom.save();
  } catch (error) {
    console.error("Помилка при створенні кімнати:", error);
  }
};

export const getAdminEmail = async (roomName) => {
  try {
    const room = await Room.findOne({ roomName });
    if (room) return room.adminEmail;
    else return null;
  } catch (error) {
    console.error("Помилка при отриманні імейл адміністратора:", error);
  }
};

export const writeSymmetricKey = async (
  userName,
  roomName,
  encryptedSymmetricKey
) => {
  try {
    // Знаходимо кімнату за її назвою
    const room = await Room.findOne({ roomName });

    if (!room) {
      throw new Error("Room not found");
    }

    // Знаходимо учасника кімнати за userName
    const participantIndex = room.participants.findIndex(
      (participant) => participant.userName === userName
    );

    if (participantIndex === -1) {
      throw new Error("User not found in the room");
    }

    // Оновлюємо поле encryptedSymmetricKey для цього учасника
    room.participants[participantIndex].encryptedSymmetricKey =
      encryptedSymmetricKey;

    // Зберігаємо зміни в базі даних
    await room.save();

    console.log("Encrypted symmetric key saved successfully");
  } catch (error) {
    console.error("Error saving encrypted symmetric key:", error);
  }
};

export const addRequest = async (name, room, publicKey) => {
  try {
    await Room.findOneAndUpdate(
      { roomName: room },
      {
        $push: {
          requests: { userName: name, publicKey: publicKey },
        },
      },
      { new: true, upsert: true }
    );
    console.log(`Request from ${name} added to room: ${room}`);
  } catch (error) {
    console.error("Error adding request:", error);
  }
};

export const getSymmetricKey = async (userName, roomName) => {
  try {
    // Шукаємо кімнату за її іменем
    const room = await Room.findOne({ roomName });

    if (!room) {
      return null; // Кімната не знайдена
    }

    // Шукаємо користувача серед учасників кімнати
    const participant = room.participants.find(
      (participant) => participant.userName === userName
    );

    // Повертаємо ключ, якщо він існує, або null, якщо ні
    return participant ? participant.encryptedSymmetricKey || null : null;
  } catch (error) {
    console.error("Error fetching symmetric key:", error);
    return null;
  }
};

export const getRequestsAndDeleteMyself = async (userName, roomName) => {
  try {
    // Знаходимо кімнату за назвою і одночасно видаляємо запит користувача
    const room = await Room.findOneAndUpdate(
      { roomName },
      { $pull: { requests: { userName: userName } } }, // видаляємо запит користувача
      { new: true, projection: "requests" } // отримуємо оновлений масив запитів
    );

    // Перевіряємо, чи кімнату знайдено
    if (!room) {
      return null;
    }

    return room.requests; // Повертаємо оновлений масив requests
  } catch (error) {
    console.error(
      "Помилка при отриманні списку запитів та видаленні запиту",
      error
    );
    throw error;
  }
};

export const clearRequests = async (roomName) => {
  try {
    await Room.updateOne({ roomName }, { $set: { requests: [] } });
  } catch (error) {
    console.error("Помилка при очищенні запитів", error);
  }
};

export const getFirstActiveUser = async (roomName) => {
  try {
    const room = await Room.findOne({ roomName });
    if (!room) console.error("Не знайдено такої кімнати");
    const activeUser = room.participants.find(
      (participant) => participant.active
    );
    if (!activeUser) return null;
    return activeUser.userName;
  } catch (error) {
    console.error("Активного користувача не знайдено", error);
  }
};

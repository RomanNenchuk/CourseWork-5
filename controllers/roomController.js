import Room from "../models/Room.js";
import bcrypt from "bcrypt";

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

export const getRoomsByNameAndCount = async (roomName, participNumber) => {
  try {
    const query = roomName
      ? { roomName: { $regex: roomName, $options: "i" } }
      : {};

    const rooms = await Room.find(query).select("roomName participants");

    const filteredRooms = rooms.filter(
      (room) => room.participants.length >= participNumber
    );

    return filteredRooms.map((room) => ({
      roomName: room.roomName,
      totalParticipants: room.participants.length,
      isActive: room.participants.some((participant) => participant.active),
    }));
  } catch (error) {
    console.error("Помилка при отриманні кімнат з учасниками:", error);
    throw error;
  }
};

export const roomExists = async (roomName) => {
  try {
    const room = await Room.findOne({ roomName });
    return !!room;
  } catch (error) {
    console.error("Помилка при перевірці кімнати:", error);
    return false;
  }
};

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

export const verifyRoomPassword = async (roomName, enteredPassword) => {
  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return false;
    }

    const isPasswordCorrect = await bcrypt.compare(
      enteredPassword,
      room.roomPassword
    );

    return isPasswordCorrect;
  } catch (error) {
    console.error("Помилка під час перевірки паролю кімнати:", error);
    return false;
  }
};

export const addUserToRoom = async (roomName, userName) => {
  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      throw new Error("Кімнату не знайдено");
    }

    const userExists = room.participants.some(
      (participant) => participant.userName === userName
    );

    if (userExists) {
      console.log("Користувач вже є у кімнаті");
      return room;
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { roomName },

      { $push: { participants: { userName, active: false } } },
      { new: true, useFindAndModify: false }
    );

    return updatedRoom;
  } catch (error) {
    console.error("Помилка при додаванні користувача до кімнати:", error);
  }
};

export const createRoomWithUser = async (
  roomName,
  userName,
  roomPassword,
  adminEmail
) => {
  try {
    const saltRounds = 10;
    const hashedRoomPassword = await bcrypt.hash(roomPassword, saltRounds);

    const newRoom = new Room({
      roomName,
      roomPassword: hashedRoomPassword,
      participants: [{ userName, active: true }],
      adminEmail,
    });

    const savedRoom = await newRoom.save();
    return savedRoom;
  } catch (error) {
    console.error("Помилка при створенні кімнати:", error);
    throw error;
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
    const room = await Room.findOne({ roomName });

    if (!room) {
      throw new Error("Кімнату не знайдено");
    }

    const participantIndex = room.participants.findIndex(
      (participant) => participant.userName === userName
    );

    if (participantIndex === -1) {
      throw new Error("Користувача не знайдено в кімнаті");
    }

    room.participants[participantIndex].encryptedSymmetricKey =
      encryptedSymmetricKey;

    await room.save();
  } catch (error) {
    console.error(
      "Помилка при збереженні зашифрованого симетричного ключа:",
      error
    );
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
  } catch (error) {
    console.error("Помилка при додаванні запиту:", error);
  }
};

export const getSymmetricKey = async (userName, roomName) => {
  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return null;
    }

    const participant = room.participants.find(
      (participant) => participant.userName === userName
    );

    return participant ? participant.encryptedSymmetricKey || null : null;
  } catch (error) {
    console.error("Error fetching symmetric key:", error);
    return null;
  }
};

export const getRequestsAndDeleteMyself = async (userName, roomName) => {
  try {
    const room = await Room.findOneAndUpdate(
      { roomName },
      { $pull: { requests: { userName: userName } } },
      { new: true, projection: "requests" }
    );

    if (!room) {
      return null;
    }

    return room.requests;
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
    if (!room) {
      console.error("Не знайдено такої кімнати");
      return null;
    }
    const activeUser = room.participants.find(
      (participant) => participant.active
    );
    if (!activeUser) return null;
    return activeUser.userName;
  } catch (error) {
    console.error("Активного користувача не знайдено", error);
  }
};

export const checkActivity = async (userName, roomName) => {
  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return false;
    }

    const participant = room.participants.find((p) => p.userName === userName);

    if (!participant || !participant.active) {
      return false;
    }

    return true;
  } catch (error) {}
};

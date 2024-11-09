import User from "../models/User.js";
import Room from "../models/Room.js";

// Отримати користувача за socketID
export const getUserByID = async (id) => {
  try {
    const user = await User.findOne({ socketID: id });
    return user;
  } catch (error) {
    console.error("Помилка при пошуку користувача:", error);
    throw error;
  }
};

// Отримати користувача за ім'ям
export const getUserByName = async (name) => {
  try {
    const user = await User.findOne({ name: name });
    return user;
  } catch (error) {
    console.error("Помилка при пошуку користувача:", error);
    throw error;
  }
};

// Перевірити, чи користувач зареєстрований
export const isRegistered = async (name) => {
  try {
    const user = await User.findOne({ name });
    return !!user;
  } catch (error) {
    console.error("Помилка при перевірці користувача:", error);
    return false;
  }
};

// перевірка паролю
export const verifyUserPassword = async (name, password) => {
  try {
    const user = await User.findOne({ name });
    if (!user || user.password !== password) {
      return false;
    }
    return true;
  } catch (error) {
    console.error("Помилка під час перевірки:", error);
    return false;
  }
};

// Зареєструвати нового користувача
export const registerUser = async (name, socketID, room, password) => {
  try {
    const user = new User({
      name,
      socketID,
      currentRoom: room,
      password,
      roomList: [{ roomName: room }],
    });
    const savedUser = await user.save();
    return savedUser;
  } catch (error) {
    console.error("Помилка при реєстрації користувача:", error);
  }
};

// Оновити дані користувача
export const updateUser = async (name, socketID, room) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { name },
      {
        $set: { socketID, currentRoom: room }, // Оновити socketID та поточну кімнату
        $addToSet: { roomList: { roomName: room } }, // Додати кімнату до roomList, якщо її ще немає
      },
      { new: true, select: "name socketID currentRoom" }
    );

    if (!updatedUser) {
      throw new Error("Користувача не знайдено");
    }

    return updatedUser;
  } catch (error) {
    console.error("Помилка при оновленні користувача:", error);
    throw error;
  }
};

// Активувати користувача у кімнаті
export const setUserActivate = async (name, room) => {
  try {
    const updatedRoom = await Room.findOneAndUpdate(
      { roomName: room, "participants.userName": name },
      { $set: { "participants.$.active": true } },
      { new: true }
    );

    if (!updatedRoom) {
      throw new Error("Кімната або користувач не знайдені");
    }

    return updatedRoom;
  } catch (error) {
    console.error("Помилка при активації користувача:", error);
    throw error;
  }
};

// Деактивувати користувача у кімнаті
export const setUserUnactivate = async (name, room) => {
  try {
    const updatedRoom = await Room.findOneAndUpdate(
      { roomName: room, "participants.userName": name },
      { $set: { "participants.$.active": false } },
      { new: true }
    );

    if (!updatedRoom) {
      throw new Error("Кімната або користувач не знайдені");
    }

    return updatedRoom;
  } catch (error) {
    console.error("Помилка при деактивації користувача:", error);
    throw error;
  }
};

export const updatePublicKey = async (userName, newPublicKey) => {
  try {
    // Знайти користувача за ім'ям
    const user = await User.findOne({ name: userName });

    if (!user) {
      throw new Error("User not found");
    }

    // Оновити публічний ключ користувача
    user.publicKey = newPublicKey;

    // Зберегти зміни в базі даних
    await user.save();

    console.log(`Public key for user ${userName} updated successfully`);
    return user;
  } catch (error) {
    console.error(`Error updating public key for ${userName}:`, error);
    throw error;
  }
};

export const getPublicKey = async (userName) => {
  try {
    const user = await User.findOne({ name: userName });
    return user ? user.publicKey : null;
  } catch (error) {
    console.error("Error fetching public key:", error);
    return null;
  }
};

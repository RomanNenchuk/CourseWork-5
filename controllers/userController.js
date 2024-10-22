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
    const user = new User({ name, socketID, currentRoom: room, password });
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
      { $set: { socketID, currentRoom: room } },
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

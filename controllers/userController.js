import User from "../models/User.js";
import Room from "../models/Room.js";
import bcrypt from "bcrypt";

export const getUserByID = async (id) => {
  try {
    const user = await User.findOne({ socketID: id });
    return user;
  } catch (error) {
    console.error("Помилка при пошуку користувача:", error);
    throw error;
  }
};

export const getUserByName = async (name) => {
  try {
    const user = await User.findOne({ name: name });
    return user;
  } catch (error) {
    console.error("Помилка при пошуку користувача:", error);
    throw error;
  }
};

export const isRegistered = async (name) => {
  try {
    const user = await User.findOne({ name });
    return !!user;
  } catch (error) {
    console.error("Помилка при перевірці користувача:", error);
    return false;
  }
};

export const verifyUserPassword = async (name, password) => {
  try {
    const user = await User.findOne({ name });
    if (!user) {
      console.error("Користувача не знайдено");
      return false;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.error("Пароль неправильний");
      return false;
    }
    console.log("Пароль правильний");
    return true;
  } catch (error) {
    console.error("Помилка під час перевірки:", error);
    return false;
  }
};

export const registerUser = async (name, socketID, room, password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      socketID,
      currentRoom: room,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    return savedUser;
  } catch (error) {
    console.error("Помилка при реєстрації користувача:", error);
    throw error;
  }
};

export const updateUser = async (name, socketID, room) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { name },
      {
        $set: { socketID, currentRoom: room },
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

export const updateSocketID = async (name, socketID) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { name },
      {
        $set: { socketID },
      },
      { new: true, select: "name socketID" }
    );

    if (!updatedUser) {
      throw new Error("Користувача не знайдено");
    }

    return updatedUser;
  } catch (error) {
    console.error("Помилка при оновленні socketID користувача:", error);
    throw error;
  }
};

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
    const user = await User.findOne({ name: userName });

    if (!user) {
      throw new Error("User not found");
    }

    user.publicKey = newPublicKey;

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

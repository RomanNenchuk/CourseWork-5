import {
  getUserByID,
  isRegistered,
  registerUser,
  verifyUserPassword,
  updateUser,
  setUserActivate,
  setUserUnactivate,
} from "../controllers/userController.js";
import {
  getUsersInRoom,
  getAllActiveRooms,
  getRoomsByNameAndCount,
  roomExists,
  wasInRoom,
  verifyRoomPassword,
  addUserToRoom,
  createRoomWithUser,
  getAdminEmail,
} from "../controllers/roomController.js";
import {
  setMessage,
  getPrevMessages,
} from "../controllers/messageController.js";
import { buildMsg } from "../utils/messageBuilder.js";

const chatSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log(`User ${socket.id} connected`);

    // відображаємо список активних кімнат (якщо такі є) для користувача, що приєднався
    const roomInfo = await getRoomsByNameAndCount("", 1);

    if (roomInfo.length) {
      socket.emit("findRoom", roomInfo);
    }

    socket.on(
      "enterRoom",
      async ({ name, room, userPassword, roomPassword, adminEmail }) => {
        try {
          const userInfo = await getUserByID(socket.id);
          let prevRoom;
          if (userInfo) {
            prevRoom = userInfo.currentRoom;
          }

          // Вихід з попередньої кімнати
          if (prevRoom) {
            socket.leave(prevRoom);
            socket.emit("leftRoom");

            await setUserUnactivate(name, prevRoom);
            io.to(prevRoom).emit(
              "message",
              buildMsg("Admin", `${name} has left the room`)
            );
          }

          // Перевірка реєстрації користувача
          const userIsRegistered = await isRegistered(name);
          let user;
          if (!userIsRegistered) {
            user = await registerUser(name, socket.id, room, userPassword);
          } else {
            // оскільки пароль ми вже перевіряли на правильність, то просто додаємо
            // користувача до кімнати
            user = await updateUser(name, socket.id, room);
          }

          // Приєднання до нової кімнати
          socket.join(user.currentRoom);
          socket.broadcast
            .to(user.currentRoom)
            .emit(
              "message",
              buildMsg("Admin", `${user.name} has joined the room`)
            );

          // Перевірка існування кімнати
          const alreadyExists = await roomExists(room);

          // якщо кімната існує
          if (alreadyExists) {
            // Перевірка, чи був користувач колись у цій кімнаті
            if (await wasInRoom(name, room)) {
              await setUserActivate(name, room);
            } else {
              // оскільки користувач вже пройшов перевірку на правильність пароля,
              // то додаю користувача до кімнати
              await addUserToRoom(room, name);
            }
          }
          // якщо кімната ще не створена
          else if (!alreadyExists) {
            await createRoomWithUser(room, name, roomPassword, adminEmail);
          }

          // Відображення попередніх повідомлень
          const prevMessages = await getPrevMessages(room);
          if (prevMessages) {
            socket.emit("roomMessages", prevMessages);
          }

          // Оновлення списку користувачів у кімнаті
          io.to(user.currentRoom).emit("userList", {
            users: await getUsersInRoom(user.currentRoom),
          });

          // Оновлення списку кімнат для всіх
          const roomInfo = await getRoomsByNameAndCount("", 1);
          if (roomInfo.length) {
            io.emit("findRoom", roomInfo);
          }

          // Повідомлення для користувача, що приєднався
          socket.emit(
            "message",
            buildMsg(
              "Admin",
              `You have joined the ${user.currentRoom} chat room`
            )
          );

          // Оновлення списку користувачів у попередній кімнаті
          if (prevRoom) {
            io.to(prevRoom).emit("userList", {
              users: await getUsersInRoom(prevRoom),
            });
          }
        } catch (error) {
          console.error("Помилка при вході в кімнату:", error);
        }
      }
    );

    // Подія від'єднання
    socket.on("disconnect", async () => {
      try {
        const user = await getUserByID(socket.id);

        if (!user) return;

        await setUserUnactivate(user.name, user.currentRoom);

        io.to(user.currentRoom).emit(
          "message",
          buildMsg("Admin", `${user.name} has left the room`)
        );

        io.to(user.currentRoom).emit("userList", {
          users: await getUsersInRoom(user.currentRoom),
        });

        const roomInfo = await getRoomsByNameAndCount("", 1);
        if (roomInfo.length) {
          socket.emit("findRoom", roomInfo);
        }

        console.log(`User ${socket.id} disconnected`);
      } catch (error) {
        console.error("Помилка при від'єднанні користувача:", error);
      }
    });

    socket.on(
      "verifyPasswords",
      async ({ name, userPassword, room, roomPassword, adminEmail }) => {
        // Якщо користувач зареєстрований, перевіряємо пароль
        if (await isRegistered(name)) {
          if (!(await verifyUserPassword(name, userPassword))) {
            socket.emit("wrongPassword", { message: "user" });
            return;
          } else {
            socket.emit("passwordConfirmed", { message: "user" });
          }
        } else {
          // Якщо користувач не зареєстрований, вважаємо, що пароль правильний
          socket.emit("passwordConfirmed", { message: "user" });
        }

        // Якщо кімната існує, перевіряємо пароль
        if (await roomExists(room)) {
          // Якщо користувач ще не був у кімнаті, перевіряємо пароль кімнати
          if (
            !(await wasInRoom(name, room)) &&
            !(await verifyRoomPassword(room, roomPassword))
          ) {
            socket.emit("wrongPassword", { message: "room" });
            return;
          } else {
            socket.emit("passwordConfirmed", { message: "room", admin: false });
          }
        } else {
          // Якщо кімната не існує, то вважаємо її пароль правильний
          if (adminEmail) {
            socket.emit("passwordConfirmed", { message: "room", admin: true });
            return;
          }
          socket.emit("askForEmail");
        }
      }
    );

    // Обробка повідомлень
    socket.on("message", async ({ name, text }) => {
      try {
        const userInfo = await getUserByID(socket.id);
        if (userInfo) {
          const room = userInfo.currentRoom;
          const msg = buildMsg(name, text);
          await setMessage(msg, room);
          if (room) {
            io.to(room).emit("message", msg);
          }
        }
      } catch (error) {
        console.error("Помилка при обробці повідомлення:", error);
      }
    });

    // Обробка активності (набирання тексту)
    socket.on("activity", async (name) => {
      try {
        const userInfo = await getUserByID(socket.id);
        if (userInfo) {
          const room = userInfo.currentRoom;
          socket.broadcast.to(room).emit("activity", name);
        }
      } catch (error) {
        console.error("Помилка при обробці активності:", error);
      }
    });

    socket.on("findRoom", async ({ roomName, participNumber }) => {
      const roomInfo = await getRoomsByNameAndCount(roomName, participNumber);
      socket.emit("findRoom", roomInfo);
    });

    socket.on("getAdminEmail", async (chatRoom) => {
      socket.emit("getAdminEmail", await getAdminEmail(chatRoom));
    });
  });
};

export default chatSocket;

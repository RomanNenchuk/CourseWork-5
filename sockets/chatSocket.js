import {
  getUserByID,
  isRegistered,
  registerUser,
  verifyUserPassword,
  updateUser,
  setUserActivate,
  setUserUnactivate,
  updatePublicKey,
  getPublicKey,
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
  writeSymmetricKey,
  addRequest,
  getSymmetricKey,
} from "../controllers/roomController.js";
import {
  setMessage,
  getPrevMessages,
  deleteMessage,
  updateMessage,
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
      async ({
        name,
        room,
        userPassword,
        roomPassword,
        adminEmail,
        hasPrivate,
        hasSymmetric,
        publicKey,
      }) => {
        try {
          const userInfo = await getUserByID(socket.id);
          let prevRoom;
          if (userInfo && room !== userInfo.currentRoom) {
            prevRoom = userInfo.currentRoom;
          }

          // Перевірка реєстрації користувача
          const userIsRegistered = await isRegistered(name);
          let user;

          if (!userIsRegistered) {
            user = await registerUser(name, socket.id, room, userPassword);
          } else {
            // оновлюємо поточну кімнату користувача
            user = await updateUser(name, socket.id, room);
          }

          if (!hasPrivate) {
            // якщо в користувача не було пари ключів, і я перегенерував, то
            // треба зберегти новий публічний ключ в базі даних
            await updatePublicKey(name, publicKey);
          }

          // Перевірка існування кімнати
          const alreadyExists = await roomExists(room);

          // якщо кімната існує
          if (alreadyExists) {
            // якщо користувач не має приватного та симетричного ключів

            // якщо користувач не мав симетричного ключа в local storage і мав приватний
            // (це для випадку, коли користувач проситься до кімнати, і його додали)
            if (!hasSymmetric && hasPrivate) {
              const setSymmetric = await getSymmetricKey(name, room);
              // якщо виявиться, що його до кімнати вже хтось додав, то він перезайде в кімнату,
              // і вже при цьому матиме і симетричний ключ, і приватний ключ
              if (setSymmetric) {
                socket.emit("checkSymmetricKey", setSymmetric);
                return;
              }
            }
            // якщо користувач не має симетричного ключа, то я відсилаю запит на приєднання
            if (!hasSymmetric) {
              await addRequest(name, room, publicKey);
              socket.broadcast
                .to(user.currentRoom)
                .emit("getSymmetricKey", name, publicKey);
              return;
            }

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
            console.log("Ahaaaaaaaaaaaaaaaa!! Created Room");
            await createRoomWithUser(room, name, roomPassword, adminEmail);
            const publicKey = await getPublicKey(name);
            socket.emit("createSymmetricKey", publicKey, true);
          }

          // Відображення попередніх повідомлень, якщо користувач має приватний та симетричний ключі
          if (hasPrivate && hasSymmetric) {
            const prevMessages = await getPrevMessages(room);
            if (prevMessages) {
              socket.emit("roomMessages", prevMessages);
            }
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

          // Приєднання до нової кімнати
          socket.join(user.currentRoom);
          socket.broadcast
            .to(user.currentRoom)
            .emit(
              "message",
              buildMsg("Admin", `${user.name} has joined the room`)
            );

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
    socket.on("message", async ({ name, text, iv }) => {
      try {
        const userInfo = await getUserByID(socket.id);
        if (userInfo) {
          const room = userInfo.currentRoom;
          const msg = buildMsg(name, text, iv);
          const objID = await setMessage(msg, room);
          if (room) {
            io.to(room).emit("message", { ...msg, _id: objID._id });
          }
        }
      } catch (error) {
        console.error("Помилка при обробці повідомлення:", error);
      }
    });

    socket.on("deleteMessage", async ({ room, id }) => {
      deleteMessage(room, id);
      socket.broadcast.to(room).emit("deleteMessage", id);
    });

    socket.on("updateMessage", async ({ room, id, updatedMsg, iv }) => {
      await updateMessage(room, id, updatedMsg.encryptedMessage, iv);
      io.to(room).emit("updateMessage", id, updatedMsg.encryptedMessage, iv);
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

    socket.on("updateKeys", async ({ userName, publicKey, roomName }) => {
      await updatePublicKey(userName, publicKey);

      // const prevMessages = await getPrevMessages(roomName);
      // if (prevMessages) {
      //   socket.emit("roomMessages", prevMessages);
      // }
    });

    socket.on(
      "writeSymmetricKey",
      async ({ userName, roomName, encryptedSymmetricKey, isAdmin }) => {
        // тому що нам не треба ще раз додавати того, хто створив кімнату
        if (!isAdmin) {
          await addUserToRoom(roomName, userName);
        }
        await writeSymmetricKey(userName, roomName, encryptedSymmetricKey);
      }
    );

    socket.on("checkSymmetricKey", async (userName, roomName) => {
      const symmetricKey = await getSymmetricKey(userName, roomName);
      // console.error(symmetricKey);

      if (symmetricKey) {
        socket.emit("checkSymmetricKey", symmetricKey);
        // const prevMessages = await getPrevMessages(roomName);
        // if (prevMessages) {
        //   socket.emit("roomMessages", prevMessages);
        // }
        // io.to(roomName).emit("userList", {
        //   users: await getUsersInRoom(roomName),
        // });
        // const roomInfo = await getRoomsByNameAndCount("", 1);
        // if (roomInfo.length) {
        //   io.emit("findRoom", roomInfo);
        // }
        // socket.emit(
        //   "message",
        //   buildMsg("Admin", `You have joined the ${roomName} chat room`)
        // );

        // Оновлення списку користувачів у попередній кімнаті
        // Спершу без
        // if (prevRoom) {
        //   io.to(prevRoom).emit("userList", {
        //     users: await getUsersInRoom(prevRoom),
        //   });
        // }
      }
    });
  });
};

export default chatSocket;

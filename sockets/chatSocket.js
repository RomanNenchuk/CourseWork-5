import {
  getUserByID,
  getUserByName,
  isRegistered,
  registerUser,
  verifyUserPassword,
  updateUser,
  updateSocketID,
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
  getRequestsAndDeleteMyself,
  clearRequests,
  getFirstActiveUser,
  checkActivity,
} from "../controllers/roomController.js";
import {
  setMessage,
  getPrevMessages,
  deleteMessage,
  updateMessage,
  buildMsg,
} from "../controllers/messageController.js";

const chatSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log(`User ${socket.id} connected`);

    // відображаємо список активних кімнат (якщо такі є) для користувача, що приєднався
    const roomInfo = await getRoomsByNameAndCount("", 1);

    if (roomInfo.length) {
      socket.emit("findRoom", roomInfo);
    }

    socket.on("enterRoom", async ({ userName, roomName }) => {
      try {
        const userInfo = await getUserByName(userName);
        let prevRoom;
        if (userInfo) {
          if (roomName !== userInfo.currentRoom)
            prevRoom = userInfo.currentRoom;
        }

        // оновлюємо поточну кімнату користувача
        await updateUser(userName, socket.id, roomName);

        // Перевірка існування кімнати
        const alreadyExists = await roomExists(roomName);

        // Відображення попередніх повідомлень
        const prevMessages = await getPrevMessages(roomName);
        if (prevMessages) {
          socket.emit("roomMessages", prevMessages);
        }

        // встановлюю статус активний
        await setUserActivate(userName, roomName);

        // Вихід з попередньої кімнати
        if (prevRoom) {
          socket.leave(prevRoom);
          // socket.emit("leftRoom");

          if (await checkActivity(userName, prevRoom)) {
            await setUserUnactivate(userName, prevRoom);
            io.to(prevRoom).emit(
              "message",
              buildMsg("Admin", `${userName} has left the room`)
            );
          }
        }

        // Оновлення списку кімнат для всіх
        const roomInfo = await getRoomsByNameAndCount("", 0);
        if (roomInfo.length) {
          io.emit("findRoom", roomInfo);
        }

        // Приєднання до нової кімнати
        socket.join(roomName);
        socket.broadcast
          .to(roomName)
          .emit(
            "message",
            buildMsg("Admin", `${userName} has joined the room`)
          );

        // Повідомлення для користувача, що приєднався
        socket.emit(
          "message",
          buildMsg("Admin", `You have joined the ${roomName} chat room`)
        );

        // Оновлення списку користувачів у кімнаті

        const usersInRoom = await getUsersInRoom(roomName);
        io.to(roomName).emit("userList", {
          users: usersInRoom,
        });

        // Оновлення списку користувачів у попередній кімнаті
        if (prevRoom) {
          io.to(prevRoom).emit("userList", {
            users: await getUsersInRoom(prevRoom),
          });
        }

        // коли я додався до кімнати, то отримую список користувачів,
        // які хочуть, щоб я поділився своїм симетричним ключем, причому
        // оскільки я також додавався, то мене слід видалити
        let requests = await getRequestsAndDeleteMyself(userName, roomName);

        if (requests) {
          socket.emit("requestQuery", requests);
          await clearRequests(roomName);
        }
      } catch (error) {
        console.error("Помилка при вході в кімнату:", error);
      }
    });

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

        const roomInfo = await getRoomsByNameAndCount("", 0);
        if (roomInfo.length) {
          io.emit("findRoom", roomInfo);
        }

        console.log(`User ${socket.id} disconnected`);
      } catch (error) {
        console.error("Помилка при від'єднанні користувача:", error);
      }
    });

    socket.on(
      "verifyPasswords",
      async ({ name, userPassword, room, roomPassword, adminEmail }) => {
        const roomCreated = await roomExists(room);
        if (!roomCreated && !adminEmail) {
          socket.emit("askForEmail");
          return;
        }
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
        if (roomCreated) {
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
          }
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
      await deleteMessage(room, id);
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

    socket.on("findRoom", async (roomName, participNumber) => {
      if (!participNumber) {
        participNumber = 0;
      }
      const roomInfo = await getRoomsByNameAndCount(roomName, participNumber);
      socket.emit("findRoom", roomInfo);
    });

    socket.on("getAdminEmail", async (chatRoom) => {
      socket.emit("getAdminEmail", await getAdminEmail(chatRoom));
    });

    socket.on(
      "writeSymmetricKey",
      async ({ userName, roomName, encryptedSymmetricKey, isAdmin }) => {
        // тому що нам не треба ще раз додавати того, хто створив кімнату
        if (!isAdmin) {
          await addUserToRoom(roomName, userName);
          console.log("Write symmetric key for " + userName);
          const userID = (await getUserByName(userName)).socketID;
          await writeSymmetricKey(userName, roomName, encryptedSymmetricKey);
          io.to(userID).emit("setSymmetricKey");
          return;
        }
        await writeSymmetricKey(userName, roomName, encryptedSymmetricKey);
      }
    );

    socket.on(
      "sendRequest",
      async (
        userName,
        roomName,
        userPassword,
        roomPassword,
        adminEmail,
        publicKey,
        hasPrivate
      ) => {
        const userIsRegistered = await isRegistered(userName);

        let user;
        if (!userIsRegistered) {
          user = await registerUser(
            userName,
            socket.id,
            roomName,
            userPassword
          );
        } else {
          await updateSocketID(userName, socket.id);
          // якщо він не генерував нового публічного ключа
          if (!publicKey) {
            publicKey = await getPublicKey(userName);
          }
        }

        if (!hasPrivate) {
          // якщо в користувача не було пари ключів, і я перегенерував, то
          // треба зберегти новий публічний ключ в базі даних
          await updatePublicKey(userName, publicKey);
        }

        // Перевірка існування кімнати
        const alreadyExists = await roomExists(roomName);
        if (!alreadyExists) {
          await createRoomWithUser(
            roomName,
            userName,
            roomPassword,
            adminEmail
          );
          socket.emit("createSymmetricKey", publicKey, true);
          return;
        }

        // якщо кімната існує
        if (alreadyExists) {
          // якщо користувач не мав симетричного ключа в local storage і мав приватний
          // (це для випадку, коли користувач проситься до кімнати, і його додали)
          if (hasPrivate) {
            const setSymmetric = await getSymmetricKey(userName, roomName);
            // якщо виявиться, що його до кімнати вже хтось додав, то він перезайде в кімнату,
            // і вже при цьому матиме і симетричний ключ, і приватний ключ
            if (setSymmetric) {
              socket.emit("checkSymmetricKey", setSymmetric);
              return;
            }
          }

          // Перевірка, чи був користувач колись у цій кімнаті
          if (!(await wasInRoom(userName, roomName))) {
            await addUserToRoom(roomName, userName);
          }

          const userID = (
            await getUserByName(await getFirstActiveUser(roomName))
          )?.socketID;
          // можливо я надсилаю повідомлення самому собі
          if (userID && userID !== socket.id) {
            socket.broadcast
              .to(userID)
              .emit("getSymmetricKey", userName, publicKey);
            return;
          }

          // якщо користувач не має симетричного ключа, то я відсилаю запит на приєднання
          await addRequest(userName, roomName, publicKey);
        }
      }
    );
  });
};

export default chatSocket;

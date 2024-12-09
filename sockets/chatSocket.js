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

        await updateUser(userName, socket.id, roomName);

        const alreadyExists = await roomExists(roomName);

        const prevMessages = await getPrevMessages(roomName);
        if (prevMessages) {
          socket.emit("roomMessages", prevMessages);
        }

        await setUserActivate(userName, roomName);

        if (prevRoom) {
          socket.leave(prevRoom);

          if (await checkActivity(userName, prevRoom)) {
            await setUserUnactivate(userName, prevRoom);
            io.to(prevRoom).emit(
              "message",
              buildMsg("Admin", `${userName} has left the room`)
            );
          }
        }

        const roomInfo = await getRoomsByNameAndCount("", 0);
        if (roomInfo.length) {
          io.emit("findRoom", roomInfo);
        }

        socket.join(roomName);
        socket.broadcast
          .to(roomName)
          .emit(
            "message",
            buildMsg("Admin", `${userName} has joined the room`)
          );

        socket.emit(
          "message",
          buildMsg("Admin", `You have joined the ${roomName} chat room`)
        );

        const usersInRoom = await getUsersInRoom(roomName);
        io.to(roomName).emit("userList", {
          users: usersInRoom,
        });

        if (prevRoom) {
          io.to(prevRoom).emit("userList", {
            users: await getUsersInRoom(prevRoom),
          });
        }

        let requests = await getRequestsAndDeleteMyself(userName, roomName);

        if (requests) {
          socket.emit("requestQuery", requests);
          await clearRequests(roomName);
        }
      } catch (error) {
        console.error("Помилка при вході в кімнату:", error);
      }
    });

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

        if (await isRegistered(name)) {
          if (!(await verifyUserPassword(name, userPassword))) {
            socket.emit("wrongPassword", { message: "user" });
            return;
          } else {
            socket.emit("passwordConfirmed", { message: "user" });
          }
        } else {
          socket.emit("passwordConfirmed", { message: "user" });
        }

        if (roomCreated) {
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
          if (adminEmail) {
            socket.emit("passwordConfirmed", { message: "room", admin: true });
          }
        }
      }
    );

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
        if (!isAdmin) {
          await addUserToRoom(roomName, userName);
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

          if (!publicKey) {
            publicKey = await getPublicKey(userName);
          }
        }

        if (!hasPrivate) {
          await updatePublicKey(userName, publicKey);
        }

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

        if (alreadyExists) {
          if (hasPrivate) {
            const setSymmetric = await getSymmetricKey(userName, roomName);

            if (setSymmetric) {
              socket.emit("checkSymmetricKey", setSymmetric);
              return;
            }
          }

          if (!(await wasInRoom(userName, roomName))) {
            await addUserToRoom(roomName, userName);
          }

          const userID = (
            await getUserByName(await getFirstActiveUser(roomName))
          )?.socketID;

          if (userID && userID !== socket.id) {
            socket.broadcast
              .to(userID)
              .emit("getSymmetricKey", userName, publicKey);
            return;
          }

          await addRequest(userName, roomName, publicKey);
        }
      }
    );
  });
};

export default chatSocket;

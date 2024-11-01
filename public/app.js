// Browser has a built in web socket class
// It is instantiated by the URL that points to the server, but we use web socket protocol
// const socket = io("ws://localhost:3500");
const socket = io();

const msgInput = document.getElementById("message");
const nameInput = document.getElementById("name");
const chatRoom = document.getElementById("room");
const userPassword = document.getElementById("user-password");
const roomPassword = document.getElementById("room-password");
const activity = document.querySelector(".activity");
const usersList = document.querySelector(".user-list");
const roomList = document.querySelector(".list");
const foundRooms = document.querySelector(".found-rooms");
const formFind = document.querySelector(".form-find");
const chatDisplay = document.querySelector(".chat-display");
const chatContainer = document.querySelector(".chat-container");
const signOut = document.querySelector(".signout");
const settings = document.querySelector(".settings-img");
const search = document.querySelector(".search-img");
const joinButton = document.getElementById("join");
const findButton = document.getElementById("find");
const findRoomByName = document.getElementById("findRoomByName");
const findRoomByCount = document.getElementById("findRoomByCount");
const registrationBar = document.querySelector(".registration");
const adminEmail = document.querySelector(".adminEmail");
const email = document.getElementById("email");
const sendMessageForm = document.querySelector(".form-msg");
const helpIcon = document.querySelector(".help-icon");
const emailHelpContainer = document.querySelector(".email-help-container");
const receivedAdminEmail = document.querySelector(".help-email");
const helpCaption = document.querySelector(".help-caption");

helpIcon.addEventListener("click", getAdminEmail);

function getAdminEmail() {
  if (chatRoom.value) {
    socket.emit("getAdminEmail", chatRoom.value);
  } else {
    alert("Enter the room name first");
  }
}

socket.on("getAdminEmail", (email) => {
  emailHelpContainer.classList.remove("hidden");
  if (email) {
    helpCaption.classList.remove("hidden");
    receivedAdminEmail.innerText = email;
  } else {
    helpCaption.classList.add("hidden");
    receivedAdminEmail.innerText = "No such room found";
  }
});

let switchElements = [registrationBar, chatContainer];

function switchOptions() {
  switchElements.forEach((element) => element.classList.toggle("hidden"));
}

settings.addEventListener("click", switchOptions);

signOut.addEventListener("click", () => {
  socket.disconnect();
  location.reload();
});

const hideErrors = () => {
  roomPassword.classList.remove("error");
  userPassword.classList.remove("error");
};

const sendMessage = () => {
  if (nameInput.value && msgInput.value && chatRoom.value) {
    socket.emit("message", {
      name: nameInput.value,
      text: msgInput.value,
    });
    // щоб повідомлення зникло в полі введення
    msgInput.value = "";
  }
  msgInput.focus();
};

const deleteMsg = (room, id) => {
  socket.emit("deleteMessage", { room, id });
};

function enterRoom(isAdmin) {
  if (nameInput.value && chatRoom.value) {
    socket.emit("enterRoom", {
      name: nameInput.value,
      room: chatRoom.value,
      userPassword: userPassword.value,
      roomPassword: roomPassword.value,
      adminEmail: isAdmin ? email.value : null,
    });
  }
  emailHelpContainer.classList.add("hidden");
}

function verifyPasswords(e) {
  e.preventDefault();
  if (
    nameInput.value &&
    chatRoom.value &&
    userPassword.value &&
    roomPassword.value
  ) {
    socket.emit("verifyPasswords", {
      name: nameInput.value,
      room: chatRoom.value,
      userPassword: userPassword.value,
      roomPassword: roomPassword.value,
      adminEmail: email.value,
    });
    console.log(adminEmail);
    console.log(email.value);
  }
}

sendMessageForm.addEventListener("submit", (e) => {
  // bc we might submit a form that has our message, and we don't want to reload a page
  // and preventDefault allows to submit a form without reloading a page
  e.preventDefault();
  sendMessage();
});

document.getElementById("send").addEventListener("click", () => {
  sendMessage();
});
document
  .querySelector(".form-join")
  .addEventListener("submit", verifyPasswords);

formFind.addEventListener("submit", findRooms);
search.addEventListener("click", findRooms);

msgInput.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.value);
});

// Listen for messages that we receive from server

socket.on("deleteMessage", (id) => {
  const temp = document.getElementById(id);
  if (temp) {
    temp.classList.add("hidden");
  }
});

socket.on("message", (data) => {
  activity.textContent = "";
  const { name, text, time, _id } = data;
  const li = document.createElement("li");
  li.className = "post";
  if (name === nameInput.value) li.className = "post post-right";
  if (name !== nameInput.value && name !== "Admin")
    li.className = "post post-left";
  if (name !== "Admin") {
    li.innerHTML = `<div class="post-header ${
      name === nameInput.value ? "post-user" : "post-reply"
    }">
        <span class="post-header-name">${name}</span>
        ${
          name === nameInput.value
            ? `<span class="delete-button">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 30 30"
                style="fill:#FFFFFF;">
                <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
              </svg>
            </span>`
            : ""
        }         
        <span>${time}</span> 
        </div>
        <div class="post-text">${text}
        </div>`;
    li.id = _id;
  } else {
    // Admin messages
    li.innerHTML = `<div class="post-text">${text}</div>`;
  }
  document.querySelector(".chat-display").appendChild(li);

  const deleteButton = li.querySelector(".delete-button");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      li.classList.add("hidden");
      deleteMsg(chatRoom.value, _id);
    });
  }

  // прогортаємо список вниз по максимуму
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

socket.on("roomMessages", (messages) => {
  const listener = socket.listeners("message")[0]; // Отримуємо перший (і єдиний) слухач
  if (listener) {
    console.log(messages);
    messages.forEach((message) => {
      listener(message);
    });
  }
});

socket.on("leftRoom", () => {
  document.querySelector(".chat-display").innerHTML = "";
});

let activityTimer;

socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;
  clearTimeout(activityTimer);
  // element we selected above
  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 3000);
});

socket.on("userList", ({ users }) => {
  // console.log("alle users:", users);
  showUsers(users);
});

socket.on("roomList", ({ rooms }) => {
  // showRooms(rooms);
});

socket.on("wrongPassword", (data) => {
  alert(`Incorrect ${data.message} password`);
  if (data.message === "user") {
    userPassword.classList.add("error");
  } else {
    roomPassword.classList.add("error");
  }
});

socket.on("passwordConfirmed", (data) => {
  // якщо пройшла автентифікація користувача
  nameInput.setAttribute("readonly", true);
  if (data.message === "user") {
    if (!userPassword.classList.contains("hidden")) {
      signOut.classList.remove("hidden");
      userPassword.classList.add("hidden");
      // switchElements[1] = signOut;
    }
  }
  // коли пройшла автентифікація кімнати
  if (data.message === "room") {
    switchOptions();
    hideErrors();
    enterRoom(data.admin);
  }
  if (data.admin) {
    adminEmail.classList.add("hidden");
  }
});

socket.on("findRoom", (roomInfo) => {
  roomList.textContent = "";
  if (roomInfo.length) {
    roomInfo.forEach((room, i) => {
      const li = document.createElement("li");
      li.textContent = `${room.roomName} (${room.totalParticipants} participants)`;
      if (room.isActive) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        chatRoom.value = room.roomName;
      });
      roomList.appendChild(li);
    });
  } else {
    foundRooms.innerHTML = "No such rooms found";
  }
});

socket.on("askForEmail", () => {
  adminEmail.classList.remove("hidden");
});

function findRooms(e) {
  e.preventDefault();
  const roomName = findRoomByName.value;
  const participNumber = findRoomByCount.value;
  if (roomName && participNumber > 0) {
    socket.emit("findRoom", { roomName, participNumber });
  }
}

function showUsers(users) {
  usersList.textContent = "";
  if (users) {
    usersList.innerHTML = `<em>Active users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      console.log(user);
      usersList.textContent += ` ${user}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ", ";
      }
    });
  }
}

function showRooms(rooms) {
  roomList.textContent = "";
  console.log("Hello");

  if (rooms) {
    // roomList.innerHTML = "<em>Active rooms: </em>";
    rooms.forEach((room, i) => {
      const li = document.createElement("li");
      li.innerText = room;
      console.log(`on room: ${li.innerText}`);
      li.addEventListener("click", () => {
        chatRoom.innerText = li.innerText;
        console.log(`Clicked on room: ${li.innerText}`);
      });
      roomList.appendChild(li);
      // if (i >= 10) return;
    });
  }
}

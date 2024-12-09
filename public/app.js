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
const findButton = document.getElementById("find");
const findRoomByName = document.getElementById("findRoomByName");
const findRoomByCount = document.getElementById("findRoomByCount");
const registrationBar = document.querySelector(".registration");
const adminEmail = document.querySelector(".adminEmail");
const email = document.getElementById("email");
const sendMessageForm = document.querySelector(".form-msg");
const sendBtn = document.getElementById("send");
const helpIcon = document.querySelector(".help-icon");
const emailHelpContainer = document.querySelector(".email-help-container");
const receivedAdminEmail = document.querySelector(".help-email");
const helpCaption = document.querySelector(".help-caption");
const editMessageForm = document.querySelector(".form-edit");
const updatedMsgInput = document.getElementById("updatedMessage");
const applyChangeBtn = document.getElementById("apply-change");
const requestSent = document.querySelector(".request-sent");
const requestList = document.querySelector(".request-list");

helpIcon.addEventListener("click", getAdminEmail);

let publicKey;

async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const publicKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKey))
  );

  const privateKey = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );
  const privateKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(privateKey))
  );
  localStorage.setItem(nameInput.value, privateKeyBase64);
  return publicKeyBase64;
}

async function generateSymmetricKey() {
  const symmetricKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedKey = await crypto.subtle.exportKey("raw", symmetricKey);

  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

  localStorage.setItem(`${nameInput.value} ${chatRoom.value}`, keyBase64);
  return keyBase64;
}

async function importPublicKey(publicKeyBase64) {
  const binaryDerString = window.atob(publicKeyBase64);
  const binaryDer = str2ab(binaryDerString);

  return await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

async function importPrivateKey(privateKeyBase64) {
  const binaryDer = Uint8Array.from(atob(privateKeyBase64), (c) =>
    c.charCodeAt(0)
  );
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

async function importSymmetricKey(base64Key) {
  const rawKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

async function encryptSymmetricKeyWithPublicKey(
  base64SymmetricKey,
  base64PublicKey
) {
  const publicKey = await importPublicKeyFromBase64(base64PublicKey);

  const symmetricKeyBuffer = Uint8Array.from(atob(base64SymmetricKey), (c) =>
    c.charCodeAt(0)
  );

  const encryptedKey = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    symmetricKeyBuffer
  );

  const encryptedKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(encryptedKey))
  );

  return encryptedKeyBase64;
}

async function decryptSymmetricKey(encryptedSymmetricKeyBase64, privateKey) {
  const encryptedArray = Uint8Array.from(
    atob(encryptedSymmetricKeyBase64),
    (c) => c.charCodeAt(0)
  );

  const decryptedSymmetricKey = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedArray
  );

  return decryptedSymmetricKey;
}

async function exportPublicKeyToBase64(publicKey) {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

async function importPublicKeyFromBase64(base64PublicKey) {
  const binaryDer = Uint8Array.from(atob(base64PublicKey), (c) =>
    c.charCodeAt(0)
  );
  const publicKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
  return publicKey;
}

async function encryptMessage(message) {
  const base64SymmetricKey = localStorage.getItem(
    `${nameInput.value} ${chatRoom.value}`
  );
  if (!base64SymmetricKey) {
    console.error("Symmetric key not found for room:", chatRoom.value);
    return;
  }

  const arrayBufferSymmetricKey = base64ToArrayBuffer(base64SymmetricKey);
  const symmetricKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferSymmetricKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);

  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    encodedMessage
  );

  const encryptedArray = new Uint8Array(encryptedContent);
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

  return {
    encryptedMessage: encryptedBase64,
    iv: arrayBufferToBase64(iv),
  };
}

async function decryptMessage(encryptedData, symmetricKey) {
  const encryptedArray = new Uint8Array(
    atob(encryptedData.encryptedMessage)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));

  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    symmetricKey,
    encryptedArray
  );

  const decoder = new TextDecoder();
  const decryptedMessage = decoder.decode(decryptedContent);

  return decryptedMessage;
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function getAdminEmail() {
  if (chatRoom.value) {
    socket.emit("getAdminEmail", chatRoom.value);
  } else {
    alert("Enter the room name first");
  }
}

let switchElements = [registrationBar, chatContainer];

function switchOptions() {
  switchElements.forEach((element) => element.classList.toggle("hidden"));
}

settings.addEventListener("click", switchOptions);

signOut.addEventListener("click", () => {
  const name = nameInput.value;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes(name)) {
      localStorage.removeItem(key);
    }
  }
  socket.disconnect();
  location.reload();
});

const hideErrors = () => {
  roomPassword.classList.remove("error");
  userPassword.classList.remove("error");
};

const sendMessage = async (e) => {
  e.preventDefault();
  if (nameInput.value && msgInput.value && chatRoom.value) {
    const encryptedMessage = await encryptMessage(msgInput.value);

    socket.emit("message", {
      name: nameInput.value,
      text: encryptedMessage.encryptedMessage,
      iv: encryptedMessage.iv,
    });

    msgInput.value = "";
  }
  msgInput.focus();
};

const deleteMsg = (room, id) => {
  socket.emit("deleteMessage", { room, id });
};

async function enterRoom(isAdmin) {
  if (nameInput.value && chatRoom.value) {
    const privateKey = localStorage.getItem(nameInput.value);

    const symmetricKey = localStorage.getItem(
      `${nameInput.value} ${chatRoom.value}`
    );

    const hasSymmetric = !!symmetricKey;
    const hasPrivate = !!privateKey;

    let publicKey;
    if (!hasPrivate) {
      publicKey = await createPublicPrivateKeys();
    }

    const adminEmail = isAdmin ? email.value : null;
    if (!hasSymmetric) {
      socket.emit(
        "sendRequest",
        nameInput.value,
        chatRoom.value,
        userPassword.value,
        roomPassword.value,
        adminEmail,
        publicKey,
        hasPrivate
      );
      requestSent.classList.remove("hidden");
      return;
    }

    requestSent.classList.add("hidden");
    document.querySelector(".chat-display").innerHTML = "";

    switchOptions();

    socket.emit("enterRoom", {
      userName: nameInput.value,
      roomName: chatRoom.value,
    });
  }
  emailHelpContainer.classList.add("hidden");
}

async function createPublicPrivateKeys() {
  const publicKey = await generateKeyPair();
  const userName = nameInput.value;
  const roomName = chatRoom.value;
  return publicKey;
}

socket.on("requestQuery", async (requests) => {
  const symmetricKey = localStorage.getItem(
    `${nameInput.value} ${chatRoom.value}`
  );
  const isAdmin = false;
  requests.forEach(async (request) => {
    writeSymmetricKey(
      isAdmin,
      request.userName,
      request.publicKey,
      symmetricKey
    );
  });
});

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

socket.on("checkSymmetricKey", async (encryptedSymmetricKey) => {
  const privateKeyBase64 = localStorage.getItem(nameInput.value);
  const privateKey = await importPrivateKey(privateKeyBase64);

  const symmetricKeyBuffer = await decryptSymmetricKey(
    encryptedSymmetricKey,
    privateKey
  );

  const symmetricKeyBase64 = arrayBufferToBase64(symmetricKeyBuffer);
  localStorage.setItem(
    `${nameInput.value} ${chatRoom.value}`,
    symmetricKeyBase64
  );
  enterRoom(false);
});

socket.on("setSymmetricKey", () => enterRoom(false));

socket.on("getSymmetricKey", async (name, foreignPublicKey) => {
  const symmetricKey = localStorage.getItem(
    `${nameInput.value} ${chatRoom.value}`
  );
  const isAdmin = false;

  await writeSymmetricKey(isAdmin, name, foreignPublicKey, symmetricKey);
});

socket.on("createPublicPrivateKeys", async () => {
  await createPublicPrivateKeys();
});

socket.on("createSymmetricKey", async (userPublicKey, isAdmin) => {
  adminEmail.classList.add("hidden");
  email.value = "";

  const symmetricKey = await generateSymmetricKey();

  await writeSymmetricKey(
    isAdmin,
    nameInput.value,
    userPublicKey,
    symmetricKey
  );

  enterRoom(isAdmin);
});

async function writeSymmetricKey(isAdmin, userName, publicKey, symmetricKey) {
  const encryptedSymmetricKey = await encryptSymmetricKeyWithPublicKey(
    symmetricKey,
    publicKey
  );

  socket.emit("writeSymmetricKey", {
    userName: userName,
    roomName: chatRoom.value,
    encryptedSymmetricKey,
    isAdmin,
  });
}

function verifyPasswords(e) {
  e.preventDefault();
  if (nameInput.value && chatRoom.value && userPassword.value) {
    socket.emit("verifyPasswords", {
      name: nameInput.value,
      room: chatRoom.value,
      userPassword: userPassword.value,
      roomPassword: roomPassword.value,
      adminEmail: email.value,
    });
  }
}

sendMessageForm.addEventListener("submit", sendMessage);

sendBtn.addEventListener("click", sendMessage);

document
  .querySelector(".form-join")
  .addEventListener("submit", verifyPasswords);

formFind.addEventListener("submit", findRooms);
search.addEventListener("click", findRooms);

msgInput.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.value);
});

function renderEditedLabel(liElement) {
  let editedLabel = liElement.querySelector(".edited-label");
  if (!editedLabel) {
    const editedLabel = document.createElement("span");
    editedLabel.classList.add("edited-label");
    editedLabel.textContent = "edited";
    liElement.appendChild(editedLabel);
  }
}

socket.on("deleteMessage", (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add("hidden");
  }
});

socket.on("updateMessage", async (id, updatedMessage, iv) => {
  const base64Key = localStorage.getItem(
    `${nameInput.value} ${chatRoom.value}`
  );
  const symmetricKey = await importSymmetricKey(base64Key);
  const decodedText = await decryptMessage(
    { encryptedMessage: updatedMessage, iv: iv },
    symmetricKey
  );
  const liElement = document.getElementById(id);
  if (liElement) {
    const postTextDiv = liElement.querySelector(".post-text");
    if (postTextDiv) {
      postTextDiv.innerText = decodedText;
      renderEditedLabel(liElement);
    }
  }
});

socket.on("message", async (data) => {
  activity.textContent = "";
  const { name, text, iv, time, _id, edited } = data;

  const li = document.createElement("li");
  li.className = "post";
  if (name === nameInput.value) li.className = "post post-right";
  if (name !== nameInput.value && name !== "Admin")
    li.className = "post post-left";
  if (name !== "Admin") {
    const base64Key = localStorage.getItem(
      `${nameInput.value} ${chatRoom.value}`
    );
    const symmetricKey = await importSymmetricKey(base64Key);
    const decodedText = await decryptMessage(
      { encryptedMessage: text, iv: iv },
      symmetricKey
    );
    li.innerHTML = `<div class="post-header ${
      name === nameInput.value ? "post-user" : "post-reply"
    }">
        <span class="post-header-name">${name}</span>
        ${
          name === nameInput.value
            ? `<span class="delete-button">
                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 30 30" style="fill:#FFFFFF;">
                    <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
                  </svg>
               </span>
               <span class="edit-button">
                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </span>
               `
            : ""
        }         
        <span>${time}</span> 
        </div>
        <div class="post-text">${decodedText}
        </div>`;
    li.id = _id;
  } else {
    li.innerHTML = `<div class="post-text">${text}</div>`;
    li.classList.add("admin-message");
  }

  if (edited) renderEditedLabel(li);

  document.querySelector(".chat-display").appendChild(li);

  const deleteButton = li.querySelector(".delete-button");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      li.classList.add("hidden");
      deleteMsg(chatRoom.value, _id);
    });
  }

  const editButton = li.querySelector(".edit-button");
  if (editButton) {
    editButton.addEventListener("click", () => {
      const postTextDiv = li.querySelector(".post-text");
      if (postTextDiv) {
        updatedMsgInput.value = postTextDiv.innerText;
        editMessageForm.classList.remove("hidden");
        sendMessageForm.classList.add("hidden");
        updatedMsgInput.focus();

        const editMessage = async (e) => {
          e.preventDefault();

          const base64SymmetricKey = localStorage.getItem(
            `${nameInput.value} ${chatRoom.value}`
          );
          if (!base64SymmetricKey) {
            console.error("Symmetric key not found for room:", chatRoom.value);
            return;
          }

          const arrayBufferSymmetricKey =
            base64ToArrayBuffer(base64SymmetricKey);
          const symmetricKey = await crypto.subtle.importKey(
            "raw",
            arrayBufferSymmetricKey,
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
          );

          const encryptedMessage = await encryptMessage(
            updatedMsgInput.value,
            symmetricKey
          );

          socket.emit("updateMessage", {
            room: chatRoom.value,
            id: _id,
            updatedMsg: encryptedMessage,
            iv: encryptedMessage.iv,
          });
          updatedMsgInput.value = "";
          editMessageForm.classList.add("hidden");
          sendMessageForm.classList.remove("hidden");
          editMessageForm.removeEventListener("submit", editMessage);
          applyChangeBtn.removeEventListener("click", editMessage);
        };
        editMessageForm.addEventListener("submit", editMessage);
        applyChangeBtn.addEventListener("click", editMessage);
      }
    });
  }
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

socket.on("roomMessages", (messages) => {
  const listener = socket.listeners("message")[0];
  if (listener) {
    messages.forEach((message) => {
      listener(message);
    });
  }
});

let activityTimer;

socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;
  clearTimeout(activityTimer);

  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 3000);
});

socket.on("userList", ({ users }) => {
  showUsers(users);
});

socket.on("wrongPassword", (data) => {
  alert(`Incorrect ${data.message} password`);
  if (data.message === "user") {
    userPassword.classList.add("error");
  } else {
    roomPassword.classList.add("error");
  }
});

socket.on("passwordConfirmed", async (data) => {
  nameInput.setAttribute("readonly", true);
  if (data.message === "user") {
    if (!userPassword.classList.contains("hidden")) {
      signOut.classList.remove("hidden");
      userPassword.classList.add("hidden");
    }
  }

  if (data.message === "room") {
    hideErrors();

    await enterRoom(data.admin);
  }
});

socket.on("findRoom", (roomInfo) => {
  roomList.textContent = "";
  if (roomInfo.length) {
    foundRooms.innerHTML = "";
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
  const participNumber = Number(findRoomByCount.value);
  if (participNumber > 0) {
    socket.emit("findRoom", roomName, participNumber);
  }
}

function showUsers(users) {
  usersList.textContent = "";
  if (users) {
    usersList.innerHTML = `<em>Active users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      usersList.textContent += ` ${user}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ", ";
      }
    });
  }
}

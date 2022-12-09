const db = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const secret = process.env.SECRET;
const saltRounds = parseInt(process.env.SALT_ROUNDS);
const User = db.users;
const Room = db.rooms;
const Message = db.messages;
const { verifyToken } = require("../auth/auth-jwt");

exports.signup = (req, res) => {
  const { name, username, password, passwordConf, role } = req.body;
  const user = new User({ name, username, role });

  if (!(name, username && password && passwordConf && role))
    return res.status(400).send({ message: "Data cannot be empty!" });

  if (password !== passwordConf)
    return res.status(400).send({ message: "Passwords do not match!" });

  User.findOne({ username: username }, async (err, userData) => {
    if (userData)
      return res.status(401).send({ message: "Username already exists" });

    user.hash = await bcrypt.hashSync(password, bcrypt.genSaltSync(saltRounds));
    user.contacts = [];
    user.rooms = [];

    await user.save();
    return res.status(200).json({
      message: `User ${user.username} created successfully!`,
    });
  });
};

exports.signin = (req, res) => {
  const { username, password, role } = req.body;
  const user = { username, password, role };

  if (!(username && password && role))
    return res.status(400).send({ message: "Data cannot be empty!" });

  User.findOne({ username: username }, async (err, userData) => {
    if (!userData) return res.status(401).send({ message: "User not found" });

    if (userData.role !== role)
      return res
        .status(401)
        .send({ message: "Please choose the correct role!" });

    if (await bcrypt.compare(password, userData.hash)) {
      const token = jwt.sign(
        { id: userData._id, username, role: userData.role },
        secret,
        { expiresIn: "1d" }
      );

      user.name = userData.name;
      user.id = userData._id;
      user.token = token;

      return res.status(200).json(user);
    } else {
      res.status(401).send({ message: "Wrong password" });
    }
  });
};

exports.auth = async (req, res) => {
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, (err, userData) => {
      return res.status(200).json({
        name: userData?.name,
        id: userData?._id,
        username: userData?.username,
        role: userData?.role,
        token: token,
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.findUser = async (req, res) => {
  const token = req.headers.authorization;
  const { username } = req.query;

  try {
    const verify = await verifyToken(token);
    if (username === verify.username)
      return res.status(401).send({ message: "Invalid Username!" });

    User.findOne({ username: username }, (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });
      return res.status(200).json({
        name: userData.name,
        id: userData._id,
        username: userData.username,
        role: userData.role,
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.addContact = async (req, res) => {
  const token = req.headers.authorization;
  const { targetId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(targetId, (err, targetData) => {
      if (!targetData)
        return res.status(401).send({ message: "User not found" });

      User.findById(verify.id, async (err, userData) => {
        const newContact = {
          id: targetData._id,
          name: targetData.name,
          username: targetData.username,
          role: targetData.role,
        };
        const filter = userData.contacts.filter(
          (contact) => contact.username == targetData.username
        );
        if (filter.length > 0)
          return res.status(401).send({ message: "Contact already exists" });

        userData.contacts.push(newContact);
        await userData.save();

        return res.status(200).json({
          message: `Contact ${targetData.name} added successfully`,
        });
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.getContacts = async (req, res) => {
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, (err, data) => {
      if (!data) return res.status(401).send({ message: "User not found" });

      return res.status(200).json(data.contacts);
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.createRoom = async (req, res) => {
  const token = req.headers.authorization;
  const { name, type, targetId } = req.body;

  try {
    const verify = await verifyToken(token);
    let newName = "";
    if (type === "group") {
      newName = name;
    } else if (type === "private") {
      newName = "";
    }

    const members = [verify.id, targetId].sort((a, b) => (a > b ? 1 : -1));

    const newRoom = new Room({
      active: true,
      name: newName,
      type: type,
      members: members,
    });

    const perUserRoom = {
      id: newRoom._id,
      pinStatus: 0,
      muteStatus: 0,
      unread: 0,
    };

    Room.findOne({ members: newRoom.members }, async (err, data) => {
      if (data) return res.status(200).send({ roomId: data._id });
      User.findById(verify.id, async (err, userData) => {
        userData.rooms.push(perUserRoom);
        await userData.save();
        User.findById(targetId, async (err, targetData) => {
          targetData.rooms.push(perUserRoom);
          await targetData.save();

          await newRoom.save();
          return res.status(200).json({ roomId: newRoom._id });
        });
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.getRooms = async (req, res) => {
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    Room.find({ members: verify.id }, (err, roomData) => {
      if (!roomData) return res.status(401).send({ message: "No rooms found" });

      const newRoom = [];

      roomData.map((room) => {
        User.findById(verify.id, (err, userData) => {
          let targetId = room.members.filter((member) => member !== verify.id);
          let propsRoom = userData?.rooms?.filter(
            ({ id }) => String(id) == String(room._id)
          );
          let messagesId = userData.messages.map((message) =>
            String(message.id)
          );

          User.findById(targetId, (err, targetData) => {
            let getLastMessage = {
              id: room.id,
              active: room.active,
              name: room.name,
              type: room.type,
              pinStatus: propsRoom[0]?.pinStatus,
              muteStatus: propsRoom[0]?.muteStatus,
              unread: propsRoom[0]?.unread,
              members: room.members,
            };
            Message.find({ roomId: room._id }, (err, messageData) => {
              const messages = messageData.filter((message) =>
                messagesId.includes(String(message.id))
              );
              if (room.name == "") {
                getLastMessage.name = targetData.name;
              }

              if (messages.length > 0) {
                getLastMessage.lastMessage =
                  messages[messages.length - 1]?.messageContent;
              } else {
                getLastMessage.lastMessage = null;
              }

              newRoom.push(getLastMessage);

              if (newRoom.length === roomData.length) {
                return res.status(200).json(newRoom);
              }
            });
          });
        });
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.pinRoom = async (req, res) => {
  const token = req.headers.authorization;
  const { roomId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, async (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });
      const newRooms = userData.rooms.map((room) =>
        String(room.id) == roomId
          ? { ...room, pinStatus: room.pinStatus == 0 ? 1 : 0 }
          : room
      );
      userData.rooms = newRooms;
      await userData.save();
      return res.status(200).json({ message: "Room pinned successfully" });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.deleteRoom = async (req, res) => {
  const token = req.headers.authorization;
  const { roomId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, async (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });

      Message.find({ roomId: roomId }, async (err, messageData) => {
        const messageId = messageData.map((message) => String(message._id));
        const messages = userData.messages.filter(
          (message) => !messageId.includes(String(message.id))
        );
        userData.messages = messages;
        await userData.save();
        return res.status(200).json({ message: "Room deleted successfully" });
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.muteRoom = async (req, res) => {
  const token = req.headers.authorization;
  const { roomId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, async (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });
      const newRooms = userData.rooms.map((room) =>
        String(room.id) == roomId
          ? { ...room, muteStatus: room.muteStatus == 0 ? 1 : 0 }
          : room
      );
      userData.rooms = newRooms;
      await userData.save();
      return res.status(200).json({ message: "Room mute successfully" });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.blockRoom = async (req, res) => {
  const token = req.headers.authorization;
  const { roomId } = req.body;

  try {
    const verify = await verifyToken(token);
    Room.findById(roomId, async (err, roomData) => {
      if (!roomData) return res.status(401).send({ message: "User not found" });

      roomData.active = !roomData.active;
      await roomData.save();
      return res.status(200).json({ message: "Room block successfully" });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.getMessages = async (req, res) => {
  const token = req.headers.authorization;
  const { roomId } = req.query;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });

      Message.find({ roomId: roomId }, (err, messageData) => {
        let messages = [];
        userData.messages.map((message) => {
          const filterMessage = messageData.filter(
            ({ _id }) => String(_id) == String(message.id)
          );
          if (filterMessage[0]) {
            filterMessage[0].messageContent.starStatus = message.starStatus;
          }

          if (String(message.id) == String(filterMessage[0]?._id)) {
            messages.push(filterMessage[0]);
          }
        });
        if (messages.length == userData.messages.length) {
          return res.status(200).json(messages);
        } else {
          return res.status(200).json(messages);
        }
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.deleteMessage = async (req, res) => {
  const token = req.headers.authorization;
  const { messageId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, async (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });
      const message = userData.messages.filter(
        (message) => !messageId.includes(String(message.id))
      );
      userData.messages = message;
      await userData.save();

      return res.status(200).json({ message: "Message deleted successfully" });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

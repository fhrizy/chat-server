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
  const user = { name, username, role };

  if (!(name, username && password && passwordConf && role))
    return res.status(400).send({ message: "Data cannot be empty!" });

  if (password !== passwordConf)
    return res.status(400).send({ message: "Passwords do not match!" });

  User.findOne({ username: username }, async (err, data) => {
    if (data)
      return res.status(401).send({ message: "Username already exists" });

    user.hash = await bcrypt.hashSync(password, bcrypt.genSaltSync(saltRounds));
    user.contacts = [];
    user.messages = [];
    User.create(user)
      .then((data) => {
        res.status(200).json({
          message: `User ${data.username} created successfully!`,
        });
      })
      .catch((err) => {
        res.status(500).send({
          message: "Some error on server occurred while creating the user.",
        });
      });
  });
};

exports.signin = (req, res) => {
  const { username, password, role } = req.body;

  if (!(username && password && role))
    return res.status(400).send({ message: "Data cannot be empty!" });

  User.findOne({ username: username }, async (err, data) => {
    if (!data) return res.status(401).send({ message: "User not found" });

    if (data.role !== role)
      return res
        .status(401)
        .send({ message: "Please choose the correct role!" });

    if (await bcrypt.compare(password, data.hash)) {
      const token = jwt.sign(
        { id: data._id, username: data.username, role: data.role },
        secret,
        { expiresIn: "1d" }
      );
      return res.status(200).json({
        name: data.name,
        id: data._id,
        username: data.username,
        role: data.role,
        token: token,
      });
    } else {
      res.status(401).send({ message: "Wrong password" });
    }
  });
};

exports.auth = async (req, res) => {
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, (err, data) => {
      return res.status(200).json({
        name: data?.name,
        id: data?._id,
        username: data?.username,
        role: data?.role,
        token: token,
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.findUser = async (req, res) => {
  const { username } = req.query;
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    if (username === verify.username)
      return res.status(401).send({ message: "Invalid Username!" });

    User.findOne({ username: username }, (err, data) => {
      if (!data) return res.status(401).send({ message: "User not found" });
      return res.status(200).json({
        name: data.name,
        id: data._id,
        username: data.username,
        role: data.role,
      });
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.addContact = async (req, res) => {
  const { targetId } = req.body;
  const token = req.headers.authorization;

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
  const { name, type, targetId } = req.body;
  const token = req.headers.authorization;

  try {
    const verify = await verifyToken(token);
    let newName = "";
    if (type === "group") {
      newName = name;
    } else if (type === "private") {
      newName = "";
    }

    const members = [verify.id, targetId].sort((a, b) => (a > b ? 1 : -1));

    const newRoom = {
      active: true,
      name: newName,
      type: type,
      members: members,
    };

    Room.findOne({ members: newRoom.members }, (err, data) => {
      if (data) return res.status(200).send({ roomId: data._id });

      Room.create(newRoom)
        .then((data) => {
          res.status(200).json({ roomId: data._id });
        })
        .catch((err) => {
          res.status(500).send({
            message: "Some error on server occurred while creating the room.",
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
          let messages = userData?.messages?.filter((message) => message.roomId == room._id);

          User.findById(targetId, (err, targetData) => {
            let getLastMessage = {
              id: room.id,
              active: room.active,
              name: room.name,
              type: room.type,
              members: room.members,
            };

            if (room.name == "") {
              getLastMessage.name = targetData.name;
            }

            if (messages?.length > 0) {
              getLastMessage.lastMessage =
                messages[messages?.length - 1]?.messageContent;
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
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

exports.deleteRoom = async (req, res) => {
  const { roomId } = req.body;

  try {
    const verify = await verifyToken(token);
    User.findById(verify.id, async (err, userData) => {
      if (!userData) return res.status(401).send({ message: "User not found" });

      const newMessages = userData.messages.filter((message) => message.roomId != roomId);
      userData.messages = newMessages;
      await userData.save();

      return res.status(200).json({message: "Room deleted successfully"});
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
      const messages = userData.messages.filter((message) => message.roomId == roomId);

      return res.status(200).json(messages);
    });
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

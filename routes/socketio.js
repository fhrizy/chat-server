const db = require("../models");
const User = db.users;
const Room = db.rooms;
const Message = db.messages;
const { verifyToken } = require("../auth/auth-jwt");

module.exports = (io) => {
  io.on(`connection`, (socket) => {
    console.log(`User Connected with Socket ID: ${socket.id}`);
    socket.on(`disconnect`, (data) => {
      console.log(`User Disconnected with Socket ID: ${socket.id}`);
    });
    socket.on(`authorize`, async (data) => {
      try {
        await verifyToken(data.token);
        try {
          const user = data.userId;
          socket.user = user;
          console.log(`User Authorized with Socket ID: ${socket.id}`);
        } catch (error) {
          console.log(error);
        }
      } catch (error) {
        console.log(error);
      }
    });
    socket.on(`join-room`, async (data) => {
      const user = socket.user;
      if (!user) return console.log("User not authorized");

      const joinedRooms = Array.from(socket.adapter.rooms.keys());
      joinedRooms.forEach((room) => {
        socket.leave(room);
      });

      const room = await Room.findById(data.roomId);
      if (!room) return console.log("Room not found");

      socket.room = data.roomId;
      socket.join(data.roomId);
      console.log(
        `User ${socket.user} Joined Room ${data.roomId} with Socket ID: ${socket.id}`
      );
    });
    socket.on(`send-message`, async (data) => {
      const user = socket.user;
      if (!user) return console.log("User not authorized");

      const room = socket.room;
      if (!room) return console.log("User not in room");

      const today = new Date();
      User.findById(user, (err, userData) => {
        if (!userData) return console.log("User not found");
        Room.findById(room, async (err, roomData) => {
          if (!roomData) return console.log("Room not found");
          const message = new Message({
            from: user,
            roomId: room,
            messageContent: {
              type: "text",
              name: userData.name,
              username: userData.username,
              message: data.message,
              readBy: [],
              starStatus: 0,
              timeSend: data.timeSend,
              timeReceived: today,
            },
          });
          await message.save();
          userData.messages.push(message);
          await userData.save();
          const targetId = roomData.members.filter((member) => member !== user);
          User.findById(targetId, async (err, targetData) => {
            targetData.messages.push(message);
            await targetData.save();
            let updateRoom = {
              id: roomData._id,
              active: roomData.active,
              name: targetData.name,
              type: roomData.type,
              members: roomData.members,
              lastMessage: message.messageContent,
            };
            io.sockets.in(room).emit(`receive-message`, message);
            io.sockets.emit(`update-room`, updateRoom);
          });
        });
      });
    });
  });
};

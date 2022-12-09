module.exports = (app) => {
  const controller = require("./controllers");
  const { verifyReqToken } = require("../auth/auth-jwt");

  var router = require("express").Router();

  router.post("/signup", controller.signup);
  router.post("/signin", controller.signin);
  router.post("/add-contact", verifyReqToken, controller.addContact);
  router.post("/create-room", verifyReqToken, controller.createRoom);

  router.get("/auth", controller.auth);
  router.get("/get-contacts", controller.getContacts);
  router.get("/get-rooms", controller.getRooms);
  router.get("/find-user", verifyReqToken, controller.findUser);
  router.get("/get-messages", controller.getMessages);

  router.post("/action-room/0", controller.pinRoom);
  router.post("/action-room/1", controller.deleteRoom);
  router.post("/action-room/2", controller.muteRoom);
  router.post("/action-room/3", controller.blockRoom);
  // router.post("/action-room/4", verifyReqToken, controller.leaveRoom);

  router.post("/action-message/0", controller.deleteMessage);
  // router.post("/action-message/1", verifyReqToken, controller.deleteMessageEveryone);
  // router.post("/action-message/2", verifyReqToken, controller.startMessage);

  app.use("/api", router);
};

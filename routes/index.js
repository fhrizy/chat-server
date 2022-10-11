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
  router.get("/get-messages", verifyReqToken, controller.getMessages);

  router.delete("/delete-room", verifyReqToken, controller.deleteRoom);

  app.use("/api", router);
};

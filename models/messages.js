module.exports = (mongoose) => {
    const schema = mongoose.Schema(
      {
        from: String,
        roomId: String,
        messageContent: Object,
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function () {
      const { _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Messages = mongoose.model("messages", schema);
    return Messages;
  };
  
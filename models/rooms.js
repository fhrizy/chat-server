module.exports = (mongoose) => {
    const schema = mongoose.Schema(
      {
        active: Boolean,
        name: String,
        type: String,
        pinStatus: String,
        muteStatus: String,
        members: Array,
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function () {
      const { _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Rooms = mongoose.model("rooms", schema);
    return Rooms;
  };
  
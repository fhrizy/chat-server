module.exports = (mongoose) => {
    const schema = mongoose.Schema(
      {
        name: String,
        username: String,
        hash: String,
        role: String,
        contacts: Array,
        messages: Array,
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function () {
      const { _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Users = mongoose.model("users", schema);
    return Users;
  };
  
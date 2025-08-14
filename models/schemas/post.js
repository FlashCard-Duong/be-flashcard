const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const postSchema = new Schema(
  {
    creator: { type: Types.ObjectId, required: true, ref: "Account" },
    flash_card: [
      {
        _id: false,
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    edit_at: { type: Date },
    status: { type: String, enum: ["APPROVED", "PENDING"] },
    deleted_by: {
      user: { type: Types.ObjectId, ref: "Account" },
    },
    banned: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);


postSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Post", postSchema);
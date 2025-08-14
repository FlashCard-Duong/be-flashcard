const HttpError = require("../models/application/httpError");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Post = require("../models/schemas/post");
const Account = require("../models/schemas/account");


const createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    return next(new HttpError("Giá trị nhập vào không hợp lệ!" , errors, 422));
  }
  const userId = req.userData.id;

  let user;
  try {
    user = await Account.findOne({ _id: userId });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
  } catch (err) {
    console.log("Bài viết 0===============: ", err);
    const error = new HttpError(
      "Có lỗi khi tạo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  const { flashCards } = req.body;
  console.log(flashCards, userId);


  const newPost = new Post({
    creator: userId,
    flash_card: flashCards,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPost.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log("Bài viết 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi tạo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  res.status(201).json({ post: newPost });
};

const savePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;
  const postId = req.params.postId;
  const save = req.body.save;
  console.log(userId,postId, save);

  try {
    const user = await Account.findOne({ _id: userId }).select(
      "saved_posts"
    );
    console.log("USER",user);

    if (!user) {
      const error = new HttpError("Không tìm thấy user từ id cung cấp!", 404);
      return next(error);
    }
    

    const post = await Post.findOne(
      { _id: postId, deleted_by: undefined },
      { creator: 1 }
    ).populate("creator", "_id");
    console.log("POST",post);
    if (!post) {
      const error = new HttpError(
        "Không tìm thấy bài viết từ id cung cấp!",
        404
      );
      return next(error);
    }

    // Kiểm tra và thêm trường saved_posts nếu không tồn tại
    if (!user.saved_posts || !user.saved_posts.length) {
      console.log("?????????????????????????");
      user.saved_posts = [];
    }

    if (save) {
      // Kiểm tra nếu bài viết đã được lưu trước đó
      const existingSavedPost = user.saved_posts.find(
        (savedPost) => savedPost.post.toString() === post._id.toString()
      );
      if (existingSavedPost) {
        const error = new HttpError("Bài viết đã được lưu trước đó!", 400);
        return next(error);
      }

      user.saved_posts.push({ post: post._id, saved_time: new Date() });
    } else {
      // Kiểm tra nếu bài viết chưa được lưu
      const savedPostIndex = user.saved_posts.findIndex(
        (savedPost) => savedPost.post.toString() === post._id.toString()
      );
      if (savedPostIndex === -1) {
        const error = new HttpError("Bài viết chưa được lưu!", 400);
        return next(error);
      }

      user.saved_posts.splice(savedPostIndex, 1);
    }

    await user.save();
  } catch (err) {
    console.log("Lỗi khi lưu/bỏ lưu bài viết: ", err);
    const error = new HttpError(
      "Có lỗi khi lưu/bỏ lưu bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.json({ message: "Cập nhật bài viết thành công!" });
};

const deletePost = async (req, res) => {
  const userId = req.userData.id;
  const postId = req.params.postId;

  let post;
  try {
    post = await Post.findOne(
      { _id: postId, deleted_by: undefined },
      { creator: 1 }
    ).populate("creator", "posts");

    if (!post) {
      const error = new HttpError(
        "Không tìm thấy bài viết từ id cung cấp!",
        404
      );
      return next(error);
    }

    if (post.creator._id.toString() !== userId) {
      const error = new HttpError("Người dùng không có quyền xóa!", 403);
      return next(error);
    }

    post.deleted_by = { user: userId, user_role: "CREATOR" };
    await post.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi khi xóa bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.json({ message: "Xóa bài viết thành công!" });
};

const getSavedPosts = async (req, res, next) => {
  const userId = req.userData.id;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(15, parseInt(req.query.limit)) || 15; // Số lượng bài viết mỗi trang (mặc định là 15)

  try {
    const user = await Account.findOne({ _id: userId }).select(
      "saved_posts"
    );
    user.saved_posts.sort((a, b) => b.saved_time - a.saved_time);

    await user.populate({
      path: "saved_posts.post",
      match: {
        deleted_by: { $exists: false }
      },
      options: { skip: (page - 1) * limit, limit: limit },
      populate: [
        { path: "creator", select: { username: 1 } },
      ],
    });

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    const savedPosts = await Promise.all(
      user.saved_posts.map(async (savedPost) => {
        const post = await Post.findById(savedPost.post).populate('creator', 'username');

        return {
            id: post._id,
            creator: {
                id: post.creator._id, // ID của người tạo
                username: post.creator.username // Tên người dùng
            },
            created_at: post.created_at,
            flash_card: post.flash_card,
            saved_time: savedPost.saved_time,
            isSaved: true,
        };
      })
    );

    res.json({ saved_posts: savedPosts });
  } catch (err) {
    console.log("Lỗi khi lấy bài viết đã lưu: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết đã lưu, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getHomePosts = async (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
    const limit = Math.max(10, parseInt(req.query.limit)) || 10; // Số lượng bài viết mỗi trang (mặc định là 10)

    try {
        const posts = await Post
            .find()
            .populate('creator', 'username') // Lấy username từ tài khoản
            .sort({ created_at: -1 })
            .skip((page - 1) * limit) // Bỏ qua số lượng tin nhắn đã lấy trước đó
            .limit(limit) // Giới hạntin nhắn
            .exec();
        // Lấy saved_posts của người dùng nếu có
        const user = await Account.findOne({_id: req.userData.id})
        const savedPosts = user ? user.saved_posts.map(saved => saved.post.toString()) : [];
        const updatePosts = posts.map(post => ({
            id: post._id,
            content: post.content,
            flash_card: post.flash_card,
            created_at: post.created_at,
            creator: {
                id: post.creator._id, // ID của người tạo
                username: post.creator.username // Tên người dùng
            },
            isSaved: savedPosts.includes(post._id.toString()),
             // Thêm username
        }));
    res.json({ posts: updatePosts });
  } catch (err) {
    console.log("Bài viết 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};


exports.createPost = createPost;
exports.getHomePosts = getHomePosts;

exports.deletePost = deletePost;

exports.savePost = savePost;
exports.getSavedPosts = getSavedPosts;